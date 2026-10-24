#!/bin/sh
# Build the single-file page from the parts, then the GitHub Pages copy.
set -e
cd "$(dirname "$0")"
{ cat head.html body.html; echo '<script>'; cat zipdata.js; cat data.js; echo; cat ar.js; echo; cat app.js; echo '</script>'; } > stump-league.html
{ echo '<!doctype html>'; echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="description" content="Stump League: nonpartisan candidate stat sheets built on official public records.">'; echo '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font-size:14px}img{max-width:100%}</style>'; cat stump-league.html; echo '</html>'; } > ../docs/index.html
