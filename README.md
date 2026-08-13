# mohamed-eldagla.github.io

Personal academic site. Static HTML, CSS, and two small vanilla-JS files. No framework, no npm, no
build step — clone it in five years and it still runs.

## Pages

| Route | File | Contents |
|---|---|---|
| `/` | `index.html` | Name, photo, one-paragraph bio, contact links. One screen, all hardcoded |
| `/publications/` | `publications/index.html` | Papers, rendered from JSON |
| `/cv/` | `cv/index.html` | Fellowships, teaching, experience, honors, education, plus the PDF |
| `/notes/` | `notes/index.html` | Placeholder for student write-ups |

The homepage is deliberately hardcoded and JS-free: the content most people will ever read should
not depend on a fetch resolving.

## Local preview

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

A server is required. Opening the files directly via `file://` renders the homepage fine but
leaves `/publications/` and `/cv/` empty, because browsers block `fetch()` of local JSON under the
`file://` origin.

## Editing content

All list content lives in `data/*.json`. Adding a paper means adding one object to
`data/publications.json` — never touching HTML.

| File | Drives |
|---|---|
| `data/publications.json` | Publications |
| `data/fellowships.json` | Fellowships |
| `data/teaching.json` | Teaching & Mentorship |
| `data/experience.json` | Experience |
| `data/honors.json` | Honors & Awards |

Education is hardcoded in `cv/index.html` because it is two entries that will rarely change.
`render.js` resolves data paths from its own location, so the same file works from any page and
survives being deployed into a subdirectory.

### If you add or remove entries

`styles.css` reserves the height of each list while it is still empty, so the page does not jump
as JSON lands (this is what keeps the layout-shift score at zero). Those are measured pixel values
in the `layout-shift reservation` block, with separate numbers for desktop and for screens under
640px. Stale numbers cost a small visible jump and nothing else — they can never break the
layout — but if you change the data much, re-measure and update them.

### Publication fields

```json
{
  "title": "…",
  "authors": ["Last, F. M.", "…"],
  "meIndex": 0,
  "venue": "Journal or conference, or null",
  "venueDetail": "volume, article number, or null",
  "year": 2026,
  "status": "published | in-submission | in-preparation",
  "metrics": { "quartile": "Q1", "impactFactor": "8.8" },
  "links": { "paper": "…", "doi": "…", "arxiv": "…", "code": "…", "bibtex": "…" },
  "thumbnail": "assets/… or null",
  "summary": "One plain-language sentence on the finding."
}
```

- `meIndex` is the zero-based position of your own name in `authors`; the renderer bolds that
  entry. It never string-matches a name, so co-authors who share a surname stay unbolded.
- `status` renders as an explicit label on every entry. The design is monochrome, so the
  distinction lives in wording and slant rather than color: a venue name is upright, while
  `in-preparation` is italic and spelled out as "Manuscript in preparation". It therefore survives
  greyscale printing and color-blind viewing, and can never be skimmed as a venue.
- Omit any key in `links` you don't have; only present keys render. Paths are written relative to
  the site root (`assets/bib/…`) and resolved by `render.js`, so they work from any page.
- The 160px thumbnail column appears only when at least one entry has a `thumbnail`, so a list
  without images has no dead gutter. Entries without one leave that column empty rather than
  showing a placeholder.

### Thumbnails

Generate them as uniform **480×320** (3:2) boxes, padded rather than cropped, into
`assets/thumbs/`. The uniform size is what keeps rows aligned and reserves the space before the
image loads:

```python
from PIL import Image
im = Image.open(src).convert("RGB")
im.thumbnail((480, 320), Image.LANCZOS)
canvas = Image.new("RGB", (480, 320), (255, 255, 255))
canvas.paste(im, ((480 - im.width) // 2, (320 - im.height) // 2))
canvas.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
```

### BibTeX

One `.bib` per paper in `assets/bib/`, referenced from the `bibtex` key. Only published work has
one — an in-preparation manuscript is not citeable, so giving it a BibTeX entry would invite
citation of something that does not exist yet.

## Assets

The site uses system fonts only — there is no webfont to host, preload, or ever re-subset.

## Email

The address is shown as text (`mohamed.eldagla [at] giu-uni.de`) with **no `mailto:` link**, which
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
2. **Notes.** `notes/index.html` has one placeholder title. Replace it when the first essay exists.

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
