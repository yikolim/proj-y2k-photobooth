# Y2K Photobooth

A private, phone-first browser photobooth: pick a template, line up your faces, take one shot, save it. Photos never leave the device.

Live: https://yikolim.github.io/proj-y2k-photobooth/ (redirects to the current version)

## Versions

Each visual version lives in its own folder under `dist/` and gets its own URL:

| Version | Folder | URL |
| --- | --- | --- |
| Windows 98 | `dist/windows/` | https://yikolim.github.io/proj-y2k-photobooth/windows/ |
| Frutiger Aero | `dist/aero/` | https://yikolim.github.io/proj-y2k-photobooth/aero/ |
| Y2K PHOTOBOOTH.exe | `dist/y2k/` | https://yikolim.github.io/proj-y2k-photobooth/y2k/ |

`dist/index.html` is a tiny redirect to the default version (currently Aero).

Everything that isn't a skin is shared, so UX changes land once and apply to every version:

- `dist/shared/app.js`, `templates.js`, `templates/` — the booth itself
- `dist/shared/styles.css`, `icy.css`, `layout.css` — base styles and the phone layout (toolbar, template strip, Filter/Save tabs)
- `dist/<version>/index.html` — same markup in each version; only the last `<link>` (the theme sheet) and the fonts differ
- `dist/<version>/<theme>.css` — colors, borders, fonts, effects only

The `y2k` version is self-contained (its own markup and `y2k.css`, no shared stylesheets) and only reuses the booth scripts.

To add a version: copy `dist/windows/index.html`, point its last stylesheet at a new theme file, and redeploy.

## Run locally

The site is static and lives in `dist/`:

```bash
python3 -m http.server 4180 --directory dist
```

Then open http://localhost:4180/aero/ (or `/windows/`). Published to GitHub Pages from the `gh-pages` branch. To redeploy after changes to `dist/`:

```bash
./deploy.sh
```

It stamps the stylesheet/script links with a version (so phones don't keep stale CSS), commits, pushes `main`, and pushes `dist/` to `gh-pages`.
