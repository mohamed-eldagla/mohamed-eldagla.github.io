/* Renders the list sections from data/*.json.
 *
 * Everything above the fold — name, position, research statement, fellowship
 * affiliations, links — is static HTML in index.html and never depends on this
 * file. If a fetch fails, the page still does its job; only the lists degrade.
 *
 * Text is set through textContent, never innerHTML, so accented names and any
 * title containing & or < render literally rather than as markup.
 */
(function () {
  'use strict';

  /* Data paths resolve against this script's own location, not the current
     page's. That keeps /publications/ and /cv/ fetching the same files as the
     homepage, and survives being deployed into a subdirectory. */
  var BASE = new URL('.', document.currentScript.src).href;

  /* ---------- tiny DOM helper ---------- */

  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else node.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      append(node, arguments[i]);
    }
    return node;
  }

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) { append(node, c); });
    } else if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }

  function sep() {
    return h('span', { class: 'sep' }, '·');
  }

  /* Paths in the JSON are written relative to the site root, so they resolve
     the same way whether they are read from / or from /publications/. */
  function resolve(url) {
    return new URL(url, BASE).href;
  }

  /* ---------- publications ---------- */

  var STATUS = {
    'published':      { label: 'Published',                 cls: 'is-published' },
    'accepted':       { label: 'Accepted at',               cls: 'is-accepted' },
    'in-submission':  { label: 'Under review',              cls: 'is-submission' },
    'in-preparation': { label: 'Manuscript in preparation', cls: 'is-preparation' }
  };

  var LINK_LABELS = {
    paper:  'paper',
    doi:    'DOI',
    arxiv:  'arXiv',
    code:   'code',
    slides: 'slides',
    bibtex: 'bibtex'
  };
  var LINK_ORDER = ['paper', 'doi', 'arxiv', 'code', 'slides', 'bibtex'];

  /* Bolding is driven by meIndex, never by matching the name as a string. */
  function authorList(authors, meIndex) {
    var parts = [];
    authors.forEach(function (name, i) {
      parts.push(i === meIndex ? h('strong', null, name) : name);
      if (i < authors.length - 1) parts.push(', ');
    });
    return parts;
  }

  function externalLink(href, text) {
    return h('a', { href: resolve(href), rel: 'noopener' }, text);
  }

  /* Thumbnails are generated as uniform 480x240 boxes. Stating the intrinsic
     size lets the browser reserve the space before the image loads. The alt is
     empty on purpose: the figure repeats the title and description beside it,
     so announcing it again is noise for a screen reader.

     Returns null when there is no image. Nothing stands in for a missing one —
     an entry simply leaves the column empty, which reads as deliberate where a
     placeholder graphic would read as a broken image. */
  function thumbCell(src) {
    if (!src) return null;
    return h('div', { class: 'pub-thumb-cell' },
      h('img', {
        class: 'pub-thumb', src: resolve(src), alt: '',
        width: 480, height: 240, loading: 'lazy', decoding: 'async'
      })
    );
  }

  function publication(p) {
    var status = STATUS[p.status] || STATUS['in-preparation'];

    var title = p.links && (p.links.paper || p.links.doi || p.links.arxiv)
      ? externalLink(p.links.paper || p.links.doi || p.links.arxiv, p.title)
      : p.title;

    var meta = [];
    if (p.status === 'accepted' && p.venue) {
      meta.push(h('span', { class: 'status ' + status.cls }, status.label));
      meta.push(' ');
      meta.push(h('span', { class: 'venue' }, p.venue));
    } else if (p.venue) {
      meta.push(h('span', { class: 'venue' }, p.venue));
      if (p.venueDetail) meta.push(' ' + p.venueDetail);
      if (p.year) meta.push(', ' + p.year);
    } else if (p.year) {
      meta.push(String(p.year));
    }
    if (p.metrics && (p.metrics.quartile || p.metrics.impactFactor)) {
      var bits = [];
      if (p.metrics.quartile) bits.push(p.metrics.quartile);
      if (p.metrics.impactFactor) bits.push('IF ' + p.metrics.impactFactor);
      meta.push(sep());
      meta.push(bits.join(' · '));
    }
    if (p.status !== 'accepted' || !p.venue) {
      meta.push(sep());
      meta.push(h('span', { class: 'status ' + status.cls }, status.label));
    }

    /* Links ride on the metadata line rather than claiming a line of their own. */
    LINK_ORDER.forEach(function (key) {
      if (p.links && p.links[key]) {
        meta.push(sep());
        meta.push(externalLink(p.links[key], LINK_LABELS[key]));
      }
    });

    var body = h('div', { class: 'pub-body' },
      h('h3', { class: 'pub-title' }, title),
      h('p', { class: 'pub-authors' }, authorList(p.authors, p.meIndex)),
      h('p', { class: 'pub-meta' }, meta),
      p.summary ? h('p', { class: 'pub-summary' }, p.summary) : null
    );

    var thumb = thumbCell(p.thumbnail);

    return h('li', { class: 'pub' + (thumb ? '' : ' no-thumb') }, thumb, body);
  }

  /* The filter bar is built here rather than written into the HTML, so the
     categories come from the data like everything else and a page with one
     category never shows a pointless filter.

     Buttons with aria-pressed rather than a <select>: the choices are few and
     worth seeing at a glance, and a button group needs no JS to explain what
     is currently active. Hiding uses the `hidden` attribute, so a filtered-out
     group leaves the accessibility tree entirely instead of lingering as
     invisible-but-focusable content. */
  function filterBar(groups) {
    var bar = h('div', { class: 'pub-filter', role: 'group',
                         'aria-label': 'Filter publications by area' });

    /* A live region, because the change happens below the button the user just
       pressed and a screen reader would otherwise get no feedback at all. */
    var status = h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

    var buttons = [];

    function select(target) {
      var shown = 0;
      groups.forEach(function (g) {
        var on = (target === null || target === g.id);
        g.section.hidden = !on;
        if (on) shown += g.count;
      });
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b._id === target));
      });
      status.textContent = 'Showing ' + shown + ' publication' +
        (shown === 1 ? '' : 's') +
        (target === null ? ' in all areas.' : '.');

      /* Reflect the choice in the URL so a filtered view can be linked and
         survives a reload. replaceState, not a hash assignment, so filtering
         never adds a history entry the back button has to walk through. */
      try {
        history.replaceState(null, '', target ? '#' + target : location.pathname);
      } catch (e) {}
    }

    function button(label, id) {
      var b = h('button', { type: 'button', class: 'pub-filter-btn',
                            'aria-pressed': 'false' }, label);
      b._id = id;
      b.addEventListener('click', function () { select(id); });
      buttons.push(b);
      return b;
    }

    bar.appendChild(button('All', null));
    groups.forEach(function (g) { bar.appendChild(button(g.name, g.id)); });
    bar.appendChild(status);

    function fromHash() {
      var id = location.hash.slice(1);
      return groups.some(function (g) { return g.id === id; }) ? id : null;
    }

    /* Honour a category already in the URL; otherwise start on All. */
    select(fromHash());

    /* Following a link to #cat-… from within the page is a same-document
       navigation — nothing reloads — so without this the URL would change and
       the filter would not. replaceState above fires no hashchange, so this
       cannot loop. */
    window.addEventListener('hashchange', function () { select(fromHash()); });

    return bar;
  }

  /* Papers are grouped by their `category` field. Groups appear in the order
     their first paper appears in the JSON, so the file alone controls both the
     grouping and its ordering — there is no second list to keep in sync, and
     reordering the page means moving an object rather than editing code. */
  function publicationGroups(items) {
    var order = [], byName = {};
    items.forEach(function (p) {
      var name = p.category || 'Other';
      if (!byName[name]) { byName[name] = []; order.push(name); }
      byName[name].push(p);
    });

    var groups = order.map(function (name) {
      var id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var list = h('ol', { class: 'pub-list', role: 'list' },
        byName[name].map(publication));

      /* Reserve the thumbnail column per group, so a group whose papers have
         no figures yet gets no dead gutter while the others still align. */
      if (byName[name].some(function (p) { return p.thumbnail; })) {
        list.classList.add('has-thumbs');
      }

      return {
        name: name,
        id: id,
        count: byName[name].length,
        section: h('section', { class: 'pub-group', 'aria-labelledby': id },
          h('h2', { class: 'pub-group-h', id: id }, name),
          list
        )
      };
    });

    /* One category means the filter would be a control with nothing to do. */
    var nodes = groups.length > 1 ? [filterBar(groups)] : [];
    return nodes.concat(groups.map(function (g) { return g.section; }));
  }

  /* ---------- generic entries ---------- */

  /* Every entry is one head line (title, with dates pushed right) plus one
     description line. The old four-stacked-line shape was most of the page's
     length. Selectivity rides at the end of the description rather than
     claiming a line of its own. */
  /* A labelled link row: its own line, so several links stay scannable and a
     reader can see what each one opens before clicking. Shared by taught
     courses, research posts and roles so every entry offers links identically. */
  /* A link with no label shows its domain instead. Deriving it from the URL
     rather than storing it means the two can never drift apart, and it gives
     each row a distinct, informative label where a repeated word like
     "Website" would say nothing about where the link goes. */
  function domainOf(url) {
    try {
      return new URL(url, BASE).hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function entryLinks(links, context) {
    if (!links || !links.length) return null;
    return h('p', { class: 'entry-links' }, links.map(function (l, i) {
      /* The arrow marks the link as leaving the site. It is aria-hidden and
         lives here rather than in the JSON label, so it stays presentation:
         a screen reader announces "Website", not "Website north east arrow". */
      var link = externalLink(l.url, l.label || domainOf(l.url));

      /* Several entries each carry a link labelled "Website", which is fine on
         screen next to its heading but useless in a screen reader's link list,
         where they would read as a row of identical entries. The hidden suffix
         names the entry, so each link is distinct out of context; it trails the
         label so the accessible name still starts with the visible words, which
         is what voice control matches on. */
      if (context) {
        link.appendChild(h('span', { class: 'visually-hidden' }, ' \u2014 ' + context));
      }
      link.appendChild(h('span', { class: 'ext', 'aria-hidden': 'true' }, '\u2197'));
      return [i ? sep() : null, link];
    }));
  }

  function entryHead(title, dates) {
    return h('div', { class: 'entry-head' },
      h('h3', { class: 'entry-title' }, title),
      dates ? h('span', { class: 'entry-dates' }, dates) : null
    );
  }

  function fellowship(f) {
    var desc = [f.role];
    if (f.mentor) {
      desc.push(' with ');
      desc.push(f.mentorUrl ? externalLink(f.mentorUrl, f.mentor) : f.mentor);
      if (f.affiliation) {
        desc.push(' (');
        desc.push(f.affiliationUrl ? externalLink(f.affiliationUrl, f.affiliation) : f.affiliation);
        desc.push(')');
      }
    }
    desc.push('. ');
    if (f.description) desc.push(f.description + ' ');
    if (f.selectivity) desc.push(h('span', { class: 'selectivity' }, f.selectivity + '.'));

    return h('li', { class: 'entry' },
      entryHead(f.name, f.dates),
      entryLinks(f.links, f.name),
      h('p', { class: 'entry-desc' }, desc)
    );
  }

  function role(r) {
    var title = [r.role, ', ', r.org];
    var desc = [];
    if (r.description) desc.push(r.description + ' ');
    if (r.selectivity) desc.push(h('span', { class: 'selectivity' }, r.selectivity + '.'));

    return h('li', { class: 'entry' },
      entryHead(title, r.dates),
      entryLinks(r.links, r.org),
      desc.length ? h('p', { class: 'entry-desc' }, desc) : null
    );
  }

  /* A taught course: title and term on the head line, then one muted line
     giving role and institution, then the description. Same shape as a
     publication entry, which is what makes the two pages read as one site.

     Course URLs live in `links` as labelled entries rather than on the title,
     so it is visible what you are about to open — and so a course whose
     programme is run by one body while the teaching contract sits with another
     can name both without either link misattributing the work. */
  function course(c) {
    var affil = [c.role, ' \u2014 '];
    affil.push(c.orgUrl ? externalLink(c.orgUrl, c.org) : c.org);


    var thumb = thumbCell(c.thumbnail);

    return h('li', { class: 'entry' + (thumb ? '' : ' no-thumb') },
      thumb,
      h('div', { class: 'entry-body' },
        entryHead(c.course, c.term),
        h('p', { class: 'course-affil' }, affil),
        entryLinks(c.links, c.course),
        c.description ? h('p', { class: 'entry-desc' }, c.description) : null
      )
    );
  }

  function honor(a) {
    return h('li', { class: 'entry' },
      entryHead(a.org ? [a.name, ', ', a.org] : a.name, a.year ? String(a.year) : null),
      entryLinks(a.links, a.name),
      a.description ? h('p', { class: 'entry-desc' }, a.description) : null
    );
  }

  /* ---------- wiring ---------- */

  var SECTIONS = [
    { file: 'publications', target: 'pub-list',        group:  publicationGroups },
    { file: 'research',     target: 'research-list',   render: fellowship },
    { file: 'teaching',     target: 'teaching-list',   render: course },
    { file: 'experience',   target: 'experience-list', render: role },
    { file: 'education',    target: 'education-list',  render: role },
    { file: 'honors',       target: 'honors-list',     render: honor }
  ];

  function fail(mount, name) {
    mount.appendChild(h('li', { class: 'load-error' },
      'Could not load ' + name + '. The full record is on ',
      externalLink('https://scholar.google.com/citations?user=F0i34RQAAAAJ', 'Google Scholar'),
      '.'
    ));
  }

  var present = SECTIONS.filter(function (s) {
    return document.getElementById(s.target);
  });

  /* Fetch everything in parallel, then insert in a single pass. Filling each
     section as its own response arrived made the page reflow once per section,
     which on a multi-section page is several visible jumps instead of one. */
  Promise.all(present.map(function (section) {
    return fetch(BASE + 'data/' + section.file + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        return res.json();
      })
      .then(function (items) { return { section: section, items: items }; })
      .catch(function (err) {
        if (window.console) console.error('render: ' + section.file, err);
        return { section: section, items: null };
      });
  })).then(function (results) {
    results.forEach(function (result) {
      var mount = document.getElementById(result.section.target);
      if (!result.items) { fail(mount, result.section.file); return; }

      var frag = document.createDocumentFragment();
      var nodes = result.section.group
        ? result.section.group(result.items)
        : result.items.map(result.section.render);
      nodes.forEach(function (node) { frag.appendChild(node); });
      mount.appendChild(frag);

      /* Reserve the thumbnail column only when something actually fills it, so
         a list with no images has no dead gutter. Grouped sections do this per
         group instead, inside publicationGroups. */
      if (!result.section.group &&
          result.items.some(function (i) { return i.thumbnail; })) {
        mount.classList.add('has-thumbs');
      }
    });
  });
})();
