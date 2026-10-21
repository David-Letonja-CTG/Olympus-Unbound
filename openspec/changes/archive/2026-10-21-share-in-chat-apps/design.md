# Design

## Pages for shared addresses

GitHub Pages serves `foo.html` for `/foo` with 200 OK and keeps the query string. `scripts/entry-pages.mjs` copies the built `index.html` to `challenge.html`, `coop.html` and `daily.html` (and to `404.html`, which the workflow did by hand). The Angular router sees the same path, so nothing in the app changes. A host serving the zip without that rule still falls back to its own 404 handling, as today.

The service worker already answers navigations with `index.html`, so installed games are unaffected.

## Two share buttons

Share sheets give each target app the files, text and URL; apps choose what they keep, and Messenger keeps the text. Sharing the picture with no text or URL makes it the only thing to send. The link goes through `shareLink` (share sheet, else clipboard), the same helper as room invites.

- **Share picture**: `sharePicture(blob)` uses the share sheet with only the file, else downloads it. Status: "Picture saved." when downloaded.
- **Share link**: `shareLink(link, title, text)`. Status: "Challenge link copied." when copied; "Challenge link: …" when even copying fails.
