#!/bin/sh
# Stamp the CSS/JS links with a version so browsers fetch fresh files, commit, push, deploy to gh-pages.
set -e
cd "$(dirname "$0")"
v=$(date +%Y%m%d%H%M)
for f in dist/*/index.html; do
  sed -i '' -E "s#(href=\"[^\"]*\.css|src=\"[^\"]*\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#g" "$f"
done
git add dist
git commit -qm "Deploy $v" || true
git push -q origin main
git subtree push --prefix dist origin gh-pages
echo "Deployed: https://yikolim.github.io/proj-y2k-photobooth/  (v=$v)"
