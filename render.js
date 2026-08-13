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

  function publication(p) {
    var status = STATUS[p.status] || STATUS['in-preparation'];

    var title = p.links && (p.links.paper || p.links.doi || p.links.arxiv)
      ? externalLink(p.links.paper || p.links.doi || p.links.arxiv, p.title)
      : p.title;

    var meta = [];
    if (p.venue) {
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
    meta.push(sep());
    meta.push(h('span', { class: 'status ' + status.cls }, status.label));

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

    /* Thumbnails are generated as uniform 480x240 boxes. Stating the intrinsic
       size lets the browser reserve the space before the image loads. The alt
       is empty on purpose: the figure repeats the title and summary beside it,
       so announcing it again is noise for a screen reader. */
    var thumb = p.thumbnail
      ? h('img', {
          class: 'pub-thumb', src: resolve(p.thumbnail), alt: '',
          width: 480, height: 240, loading: 'lazy', decoding: 'async'
        })
      : null;

    return h('li', { class: 'pub' + (thumb ? '' : ' no-thumb') },
      thumb ? h('div', { class: 'pub-thumb-cell' }, thumb) : null,
      body
    );
  }

  /* ---------- generic entries ---------- */

  /* Every entry is one head line (title, with dates pushed right) plus one
     description line. The old four-stacked-line shape was most of the page's
     length. Selectivity rides at the end of the description rather than
     claiming a line of its own. */
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
      entryHead(f.url ? externalLink(f.url, f.name) : f.name, f.dates),
      h('p', { class: 'entry-desc' }, desc)
    );
  }

  function role(r) {
    var title = [r.role, ', ', r.orgUrl ? externalLink(r.orgUrl, r.org) : r.org];
    var desc = [];
    if (r.description) desc.push(r.description + ' ');
    if (r.selectivity) desc.push(h('span', { class: 'selectivity' }, r.selectivity + '.'));

    return h('li', { class: 'entry' },
      entryHead(title, r.dates),
      desc.length ? h('p', { class: 'entry-desc' }, desc) : null
    );
  }

  function honor(a) {
    return h('li', { class: 'entry' },
      entryHead(a.org ? [a.name, ', ', a.org] : a.name, String(a.year)),
      a.description ? h('p', { class: 'entry-desc' }, a.description) : null
    );
  }

  /* ---------- wiring ---------- */

  var SECTIONS = [
    { file: 'publications', target: 'pub-list',        render: publication },
    { file: 'fellowships',  target: 'fellowship-list', render: fellowship },
    { file: 'teaching',     target: 'teaching-list',   render: role },
    { file: 'experience',   target: 'experience-list', render: role },
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
      result.items.forEach(function (item) {
        frag.appendChild(result.section.render(item));
      });
      mount.appendChild(frag);

      /* Reserve the thumbnail column only when something actually fills it,
         so a list with no thumbnails has no dead gutter. */
      if (result.section.file === 'publications' &&
          result.items.some(function (p) { return p.thumbnail; })) {
        mount.classList.add('has-thumbs');
      }
    });
  });
})();
