{ cat head.html body.html; echo '<script>'; cat zipdata.js; cat data.js; echo; cat ar.js; echo; cat app.js; echo '</script>'; } > stump-league.html
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'; cat stump-league.html; echo '</html>'; } > preview.html
