# Hosting

OLYMPUS UNBOUND is a static site (D1): no server of its own, no database. Each published GitHub Release goes live on **GitHub Pages** at **https://david-letonja-ctg.github.io/Olympus-Unbound/**, and the built game is attached to the release as a zip anyone can host. Co-op rooms connect players' browsers directly (D16); only the public PeerJS service introduces them.

- [How it fits together](#how-it-fits-together)
- [One-time setup](#one-time-setup)
- [Releasing](#releasing)
- [Hosting the zip elsewhere](#hosting-the-zip-elsewhere)
- [Troubleshooting](#troubleshooting)

## How it fits together

```mermaid
flowchart LR
  Dev["Merge to main"] --> CI["CI<br/>check · e2e"]
  Release["Publish a release<br/>v1.2.3"] --> Deploy
  subgraph Deploy["Deploy workflow"]
    Wait["wait for CI<br/>on the release's commit"] --> Zip["build for download<br/>(base /) → zip"]
    Zip --> Pages["build for Pages<br/>(base /Olympus-Unbound/)"]
    Pages --> Live["deploy-pages → smoke test"]
  end
  Zip -- "olympus-unbound-v1.2.3.zip" --> Assets[("Release assets")]
  Live --> Site[("github.io/Olympus-Unbound")]
  Player["Browser"] --> Site
```

| Piece | Where it is defined |
|---|---|
| CI (every push and pull request) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Deploy (on releases) | [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) |
| The build | `npm run build` in `client/`, with `--base-href` for where the site lives |

- **Paths:** Pages serves a project site under `/Olympus-Unbound/`, so the app never refers to files from the site root. Code loads `assets/...` relative to the `<base href>`, and the global styles reference their fonts and frames from `public/`, so the build bundles them with relative URLs.
- **Deep links:** a link such as `/Olympus-Unbound/play` has no file behind it. Pages answers with `404.html`, which the build makes a copy of `index.html`, so the app starts and its router takes over. The addresses players send each other (`challenge`, `coop`, `daily`) get their own copies (`challenge.html` and so on, made by `scripts/entry-pages.mjs`): Pages serves them for `/challenge?…` with 200 OK, and chat apps only show a link preview for a page that is found.
- **Link preview (D19):** `index.html` names `https://david-letonja-ctg.github.io/Olympus-Unbound/og-image.jpg` and the same address for `og:url`, absolute as previews require. A fork or another host should change both (in `client/src/index.html`).
- **Installed and offline (D18):** the production build contains `ngsw-worker.js` and `ngsw.json`, the service worker's list of every file with its hash, and a `manifest.webmanifest` with relative paths. After a visit, the browser keeps the whole game.
  - A new release is noticed at the next launch, or within 30 minutes, and downloaded in the background. The main menu then offers to reload.
  - Files are content-hashed, so a version never mixes files of another.
  - Any host works, as long as it serves `ngsw.json` and the worker from the build's folder.

## One-time setup

Already done for this repository (2026-10-12); repeat it only for a fork or a new repository.

1. The repository is **public**: Pages for a private repository needs a paid GitHub plan.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. *Settings → Environments → github-pages → Deployment branches and tags:* add the tag rule **`v*`**. Releases deploy from their tag, and the environment allows only `main` by default.

With the GitHub CLI, the same:

```bash
gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow
gh api -X POST repos/OWNER/REPO/environments/github-pages/deployment-branch-policies -f name='v*' -f type=tag
```

## Releasing

Merging into `main` only runs CI. The game goes live by **publishing a release**:

```bash
gh release create v0.1.0 --generate-notes        # or GitHub → Releases → Draft a new release
```

- Version tags look like `v1.2.3`: raise the last number for fixes, the middle one for new features, the first for big changes.
- A release marked as a **pre-release** doesn't deploy.
- The release's commit must be on `main` with a passing CI run; the workflow waits for a CI run still in progress.

When a release is published, the **Deploy** workflow:

1. checks the tag and waits for CI on its commit;
2. builds the game for the root of any host and attaches it to the release as `olympus-unbound-<version>.zip`;
3. builds it again for Pages (`--base-href /Olympus-Unbound/`, plus `404.html` and the shared addresses' pages) and deploys it;
4. smoke-tests the site: the page, a sprite sheet and a deep link must answer.

**By hand:** *Actions → Deploy → Run workflow* with a version tag redeploys that version, for example to roll back to an older release.

Saves live in each player's browser (`localStorage`, per site), so a new version keeps everyone's progress. Older saves are migrated (D8).

## Hosting the zip elsewhere

The zip is the game for the root of a static host: unzip it and serve the folder.

- **Locally:** `npx serve -s .` (the `-s` makes unknown paths serve the app).
- **Any static host** (Netlify, Cloudflare Pages, an nginx or Caddy server): point it at the folder, and make unknown paths serve `index.html`, or `404.html` where the host uses that.
- **Under a sub-path:** build it yourself with `npx ng build --base-href /your/path/` in `client/`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Deploy fails with *not allowed to deploy to github-pages due to environment protection rules* | The `v*` tag rule is missing from the `github-pages` environment (one-time setup, step 3). |
| Deploy fails with *Get Pages site failed* or *Not Found* | Pages is not enabled with the GitHub Actions source (one-time setup, step 2). |
| *no CI run on main for …* | The tag points at a commit that is not on `main`. Release from `main`. |
| The site loads but shows no fonts, frames or art | Something refers to a file from the site root (`/…`). Load files relative to the base href (`assets/…`) or from `public/` in styles. |
| Players keep an old version | Their game has not checked yet, or they have not tapped *Reload* on the menu's notice. A check runs at every launch. In an emergency, deleting `ngsw.json` from the site makes the worker step aside on the next visit. |
| A reload on `/play` shows GitHub's 404 page | `404.html` is missing from the build; `scripts/entry-pages.mjs` copies it from `index.html`. |
| A pasted challenge link shows no preview | The address answers 404: `challenge.html` is missing, or the route is not in `scripts/entry-pages.mjs`. |
