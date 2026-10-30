# Y2K Photobooth

A private, phone-first browser photobooth: pick a template, line up your faces, take one shot, save it. Photos never leave the device.

Live: https://yikolim.github.io/proj-y2k-photobooth/

## Run locally

The site is static and lives in `dist/`:

```bash
python3 -m http.server 4180 --directory dist
```

Then open http://localhost:4180. Published to GitHub Pages from the `gh-pages` branch. To redeploy after changes to `dist/`:

```bash
git subtree push --prefix dist origin gh-pages
```
