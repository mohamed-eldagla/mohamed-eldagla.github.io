# mohamed-eldagla.github.io

Personal academic site. Static HTML, CSS, and two small vanilla-JS files. No framework, no npm, no
build step — clone it in five years and it still runs.

## Pages

| Route | File | Contents |
|---|---|---|
| `/` | `index.html` | Name, photo, one-paragraph bio, contact links. One screen, all hardcoded |
| `/publications/` | `publications/index.html` | Papers grouped by category, rendered from JSON |
| `/talks/` | `talks/index.html` | Talks, grouped by year, rendered from JSON |
| `/teaching/` | `teaching/index.html` | Courses taught, one entry per course with an image, rendered from JSON |
| `/awards/` | `awards/index.html` | Honors and awards, grouped by year, rendered from JSON |
| `/cv/` | `cv/index.html` | Research experience, industry experience, education, academic service, plus the PDF |
| `/blog/` | `blog/index.html` | Posts; two placeholder titles so far |

Publications, talks, teaching, and awards each own a top-level page rather than living inside the CV, so
the nav links straight to them. The CV page carries the sections that have no page of their own
and links out to the rest. Nothing is duplicated: exactly one page renders each JSON file.

The nav is hand-written in each page's `<head>`-to-`<body>` block rather than injected by JS, so
it survives with scripting off. Adding a route means editing the same `<ul>` in every page — seven
files — and adding a line to `sitemap.xml`.

The homepage is deliberately hardcoded and JS-free: the content most people will ever read should
not depend on a fetch resolving.

## Local preview

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

A server is required. Opening the files directly via `file://` renders the homepage fine but
leaves `/publications/`, `/talks/`, `/teaching/`, `/awards/`, and `/cv/` empty, because browsers block `fetch()` of local JSON under the
`file://` origin.

## Editing content

All list content lives in `data/*.json`. Adding a paper means adding one object to
`data/publications.json` — never touching HTML.

| File | Drives |
|---|---|
| `data/publications.json` | Publications (`/publications/`) |
| `data/research.json` | Research Experience — fellowships, internships, lab roles (`/cv/`) |
| `data/talks.json` | Talks (`/talks/`) |
| `data/teaching.json` | Teaching — courses grouped by institution (`/teaching/`) |
| `data/experience.json` | Experience (`/cv/`) |
| `data/education.json` | Education (`/cv/`) |
| `data/service.json` | Academic Service (`/cv/`) |
| `data/honors.json` | Honors & Awards (`/awards/`) |

Education used to be hardcoded in `cv/index.html`. It moved into JSON once entries grew a links
row: hand-written markup would have had to repeat the `aria-hidden` arrow and the visually-hidden
suffix, and would drift from `render.js` the next time either changed. It shares
`experience.json`'s shape and renders through the same function.

### Page layouts

The CV, Awards, and Talks pages use one layout: dates in a narrow left column, the entry on the
right. On Awards and Talks the year shows once per group, with a hairline between years, so the
order of the JSON matters — keep them newest first. On the CV every row shows its own date range,
the organisation is the title, the role sits beneath it in muted type, and an optional `bullets`
array renders as a short list (falling back to `description` when there are no bullets). A role
covering separate lines of work can use `projects` instead of `bullets`: each has a `title`,
optional `bullets`, and optional `mentor`, `mentorUrl`, `affiliation`, `affiliationUrl`, and
`mentorLabel` (defaults to "with"). Below 640px the date column folds above each entry.

`render.js` resolves data paths from its own location, so the same file works from any page and
survives being deployed into a subdirectory.

### If you add or remove entries

`styles.css` reserves the height of each list while it is still empty, so the page does not jump
as JSON lands (this is what keeps the layout-shift score at zero). Those are measured pixel values
in the `layout-shift reservation` block, with separate numbers for desktop and for screens under
640px. Stale numbers cost a small visible jump and nothing else — they can never break the
layout — but if you change the data much, re-measure and update them.

### Teaching fields

Courses sit in groups. A group with a shared role (the four GIU courses) states the institution
and role once in its heading, and its courses omit `role`/`org`; the "Other teaching" group has no
role, so each of its courses keeps its own. Each course is still its own entry with its own image,
which is what makes the page read as a teaching record rather than a job history.

```json
{
  "heading": "German International University in Cairo",
  "url": "https://… (optional; links the heading)",
  "role": "Teaching Assistant, Faculty of Informatics (optional)",
  "courses": [ … ]
}
```

A course:

```json
{
  "course": "Big Data & NoSQL Databases",
  "term": "Spring 2026",
  "role": "Teaching Assistant",
  "org": "German International University in Cairo",
  "orgUrl": "https://… or null",
  "thumbnail": "assets/thumbs/… or null",
  "links": [{ "label": "Course Website", "url": "https://…" }],
  "description": "One sentence on what was actually taught."
}
```

On the Teaching page, `links` render on their own row beneath the role line, each with a visible
label. `orgUrl` may be `null`, which renders the organisation as plain text — used for the
repeated university name, where four identical links in a row were noise rather than navigation.

Elsewhere — CV, Awards, Talks — `links` is an optional list of `{label, url}` pairs where the
**first** link becomes the entry's title link (marked with a small ↗), and any further links trail
the last line of the entry, separated by `·`. Nothing renders as a row of bare links between the
title and the text. Omit the key entirely when there is nothing to link.

**`label` is optional.** Omit it and the link shows its own domain (`fatima.institute`,
`aialignment.mit.edu`), derived from the URL so the two can never drift apart. Give an explicit
`label` for links shown as text — `Certificate`, `Video`, `Badge` — where the word says more than a
domain would. A label on the first link is unused, since that link is the title.

The ↗ is `aria-hidden`, so it is never read aloud, and each trailing link carries a
visually-hidden suffix naming its entry — several links reading "Certificate" or "Video" are
clear on the page but identical in a screen reader's link list, which is how many people navigate.

`thumbnail` takes the same 480×240 image treatment as a publication (see **Thumbnails** below);
drop files into `assets/thumbs/`. The 160px column appears only once at least one entry
has an image, so the page reads correctly while they are still being added, and an entry without
one leaves the column empty rather than showing a placeholder graphic.

Entries render in file order. They are currently reverse-chronological with the university
courses grouped ahead of the mentoring roles, which reads better than strict date order.

### Publication fields

```json
{
  "category": "AI Safety and Interpretability",
  "title": "…",
  "authors": ["Last, F. M.", "…"],
  "meIndex": 0,
  "venue": "Journal or conference, or null",
  "venueDetail": "workshop name, volume, article number, or null",
  "venueUrl": "https://workshop.example.com/ or omitted",
  "year": 2026,
  "status": "published | accepted | in-submission | in-preparation",
  "metrics": { "quartile": "Q1", "impactFactor": "8.8" },
  "links": { "paper": "…", "doi": "…", "arxiv": "…", "code": "…", "bibtex": "…" },
  "thumbnail": "assets/… or null",
  "summary": "One plain-language sentence on the finding."
}
```

- `category` groups the entry on the publications page. Groups appear in the order their first
  paper appears in the file, so `data/publications.json` alone controls both the grouping and its
  ordering — there is no second list of categories to keep in sync. To rename a group, change the
  string on every paper in it; to reorder groups, move the objects. An entry with no `category`
  falls into a group called "Other".
- The filter bar above the list is built by `render.js` from the categories present in the data,
  so it needs no maintenance — add a category and a button appears; drop to one category and the
  bar disappears rather than offering a control with nothing to do. The active filter is mirrored
  in the URL (`/publications/#cat-medical-ai`), so a filtered view can be linked and survives a
  reload. Printing ignores the filter and prints every category: a printed list that silently
  omits papers is the worse surprise.
- `meIndex` is the zero-based position of your own name in `authors`; the renderer bolds that
  entry. It never string-matches a name, so co-authors who share a surname stay unbolded.
- `equalContribution` (optional) lists the zero-based positions of equal-contribution authors;
  each gets a superscript `*` and the line ends with "(*equal contribution)".
- `highlight` (optional) is one bold line under the venue for a distinction such as an oral, e.g.
  `"Oral presentation (1 of 4 orals from 267 submissions, ≈1.5%)"`.
- `status` renders as an explicit label on every entry. The design is monochrome, so the
  distinction lives in wording and slant rather than color: a venue name is upright, while
  `in-preparation` is italic and spelled out as "Manuscript in preparation". It therefore survives
  greyscale printing and color-blind viewing, and can never be skimmed as a venue.
- Omit any key in `links` you don't have; only present keys render. Paths are written relative to
  the site root (`assets/bib/…`) and resolved by `render.js`, so they work from any page.
- The 160px thumbnail column appears only when at least one entry *in that group* has a
  `thumbnail`, so a group whose papers have no figures yet has no dead gutter while the others
  still align. Entries without one leave that column empty rather than
  showing a placeholder.

### Thumbnails

Generate them as uniform **480×240** (2:1) boxes, padded rather than cropped, into
`assets/thumbs/`. The uniform size is what keeps rows aligned and reserves the space before the
image loads, and 2:1 is what `.pub-thumb` pins with `aspect-ratio` — ship a different ratio and
the browser will stretch it.

```python
from PIL import Image
W, H = 480, 240

im = Image.open(src)
# Flatten onto white rather than convert("RGB"), which drops the alpha channel
# and leaves transparent pixels black. Matplotlib figures are often RGBA.
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    flat = Image.new("RGB", im.size, (255, 255, 255))
    flat.paste(im, mask=im.split()[-1])
    im = flat
else:
    im = im.convert("RGB")

im.thumbnail((W, H), Image.LANCZOS)
canvas = Image.new("RGB", (W, H), (255, 255, 255))
canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
canvas.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
```

Keep the full-resolution original outside the repo — the thumbnail is lossy and cropped, and you
will want the source again. A thumbnail is displayed **160px wide**, so a multi-panel composite
figure reduces to unreadable specks; crop to the single most legible panel instead.

### BibTeX

One `.bib` per paper in `assets/bib/`, referenced from the `bibtex` key. Only published work has
one — an in-preparation manuscript is not citeable, so giving it a BibTeX entry would invite
citation of something that does not exist yet.

## Assets

The site uses system fonts only — there is no webfont to host, preload, or ever re-subset.

## Email

The addresses are shown as text (`meldagla3 [at] gmail.com` and `mohamed.eldagla [at] giu-uni.de`) with **no `mailto:` link**, which
is the point: a `mailto:` href is trivially scraped, so linking it would undo the obfuscation. The
cost is that visitors cannot click to compose — if you would rather have that, replace the
`.email` line in `index.html` with a normal `mailto:` anchor.

The address is also absent from the JSON-LD block for the same reason; structured data is the
first thing a scraper parses.

## Theme

The page follows the visitor's system setting. The button in the nav overrides that and stores the
choice in `localStorage`; clearing that key returns control to the system.

Two things are easy to break here. The dark tokens in `styles.css` are declared **twice** — once
under `prefers-color-scheme` guarded by `:not([data-theme="light"])`, once under
`[data-theme="dark"]` — so that an explicit choice wins in *both* directions. Collapsing them into
one block breaks the light-mode override on a dark OS. And the small inline script in each page's
`<head>` must stay inline and blocking: moved into `theme.js`, the page would flash the wrong
theme on every load.

- `favicon.svg` / `assets/favicon-32.png` / `assets/apple-touch-icon.png` — the "M" is a plain
  geometric path, not a font glyph, so the icons carry no font dependency.
- `assets/profile.jpg` — 400px square, EXIF stripped. Source of truth for the crop is
  `personal_image.jpg` in the repo root; delete that file if you don't want the original published.
- `assets/og-image.png` — 1200×630 social card. Regenerate only if the name or affiliations change.

## Still to add

1. **ORCID.** If you register one, add it to the `sameAs` array in the JSON-LD block in
   `index.html`. That array is what tells indexers your Scholar, GitHub, and LinkedIn profiles are
   the same person.
2. **Blog.** `blog/index.html` has two placeholder titles ("Do People Really Want Different
   Things? Reward Basis Decomposition" and "Prerequisites Are All You Need", both marked
   *Coming soon*). Replace them with the real posts when they exist — a nav item leading to a page of
   nothing but placeholders reads as abandoned.

## Deploying

The site must sit at the root of a repo named `mohamed-eldagla.github.io` on the `main` branch.

```sh
git init
git add .
git commit -m "Personal academic site"
git branch -M main
git remote add origin git@github.com:mohamed-eldagla/mohamed-eldagla.github.io.git
git push -u origin main
```

Then enable Pages in the repo settings (Source: `main`, folder: `/`).

If you change the domain, update the absolute URLs in `index.html` (canonical + Open Graph +
JSON-LD), `sitemap.xml`, and `robots.txt`.
