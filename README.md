# Y2K Photobooth

A private, phone-first browser photobooth: pick a template, line up your faces, take one shot, save it. Photos never leave the device.

Live: https://yikolim.github.io/proj-y2k-photobooth/ (redirects to the current version)

## Versions

Each visual version lives in its own folder under `dist/` and gets its own URL:

| Version | Folder | URL |
| --- | --- | --- |
| Windows 98 | `dist/windows/` | https://yikolim.github.io/proj-y2k-photobooth/windows/ |
| Aero | `dist/aero/` | https://yikolim.github.io/proj-y2k-photobooth/aero/ (coming) |

`dist/index.html` is a tiny redirect to whichever version is the default.

## Run locally

The site is static and lives in `dist/`:

```bash
python3 -m http.server 4180 --directory dist
```

Then open http://localhost:4180/windows/. Published to GitHub Pages from the `gh-pages` branch. To redeploy after changes to `dist/`:

```bash
git subtree push --prefix dist origin gh-pages
```
