# Minimalist Academic-Style Blog

This project implements a simple, file‑based blog system targeted at young professionals who want to showcase their research and writing in a clean, academic manner.  It uses plain HTML, CSS and a small amount of JavaScript to dynamically load blog posts stored under the `blogs/` directory.

## Features

* **Minimalist design:** Uses the Solarized colour palette to provide a comfortable reading experience in both light and dark modes【721455089404405†L90-L110】.  The layout uses generous whitespace, clear typography and very little visual noise so that the content remains the focus.
* **Responsive:** The layout adapts to different screen sizes.  On small screens the navigation bar collapses into a hamburger menu.
* **Automatic theming:** The site respects the visitor’s `prefers‑color‑scheme` setting and switches between the Solarized light and dark palettes accordingly【721455089404405†L90-L110】.
* **File‑based posts:** Each post lives in its own folder under `blogs/<category>/<post>/` with a `meta.json` file (metadata), a `content.md` or `content.tex` file (raw content) and an optional `images/` folder.  A Node.js script (`scripts/generate_index.js`) scans the file hierarchy and produces `categories.json` which drives the site navigation and category pages.
* **Markdown/LaTeX support:** Posts written in Markdown are rendered into HTML via the [Marked](https://github.com/markedjs/marked) library.  LaTeX posts are displayed with basic formatting and can be further enhanced by enabling MathJax.
* **Sample content:** A couple of example categories and posts are included to demonstrate the required file structure.

## Getting Started

1. **Install dependencies for optional scripts** (requires Node.js ≥14):

   ```sh
   npm install
   ```

2. **Generate category index:** Whenever you add or remove posts, run:

   ```sh
   node scripts/generate_index.js
   ```

   This will create/update the `categories.json` file based on the folders under `blogs/`.

3. **Serve the site:** Open `index.html` in your browser or use a simple HTTP server (e.g. `python3 -m http.server`) to avoid CORS issues when loading JSON files locally.

4. **Writing new posts:**
   * Create a new folder under `blogs/<category>/<post‑folder>/`.
   * Add a `content.md` or `content.tex` file.
   * Optionally create a `meta.json` with `title`, `date` (YYYY‑MM‑DD), `tags` and `summary`.  If omitted, you can run `node scripts/generate_meta.js` to populate it automatically.
   * Place any images in an `images/` sub‑folder.  Refer to them in your markdown with relative paths (e.g. `images/myfigure.png`).

5. **About/CV:** The `about.html` page is a placeholder where you can embed your résumé or introduce yourself.  It is linked from the navigation bar.

Feel free to extend the site with search, tag filters, RSS feeds or other features as needed.