# Hosting

OLYMPUS UNBOUND is a static site (D1). Each published GitHub Release goes live on **GitHub Pages** at **https://david-letonja-ctg.github.io/Olympus-Unbound/**, and the built game is attached to the release as a zip anyone can host.

Co-op rooms, the open rooms and the world boards go through the **game server** (D21). It runs as a Docker Compose stack on an Oracle Cloud VM and is deployed by the same releases ([The game server](#the-game-server)). Until the server is set up, releases publish the game without co-op and world boards.

- [How it fits together](#how-it-fits-together)
- [One-time setup](#one-time-setup)
- [Releasing](#releasing)
- [Hosting the zip elsewhere](#hosting-the-zip-elsewhere)
- [Troubleshooting](#troubleshooting)
- [The game server](#the-game-server)

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

## The game server

The game server (D21) runs on one **Oracle Cloud (OCI) Always Free** Arm VM as a Docker Compose stack, exactly as Slovion does: Caddy (HTTPS), the API, and PostgreSQL. Publishing a release deploys it before the game.

```mermaid
flowchart LR
  Player["The game<br/>(github.io)"] -- "HTTPS · WSS" --> Web
  subgraph VM["OCI Always Free VM — /opt/olympus"]
    Web["web<br/>Caddy: certificates, proxy"] -- "/api, /rooms, /health" --> Api["api<br/>Node.js game server"] --> Db[("db<br/>PostgreSQL 18")]
    Timer["olympus-backup.timer<br/>03:30 UTC"] -- "pg_dump" --> Db
  end
  Timer -- "upload" --> Bucket[("Object Storage bucket")]
  CI["Deploy workflow"] -- "images" --> GHCR[("ghcr.io")]
  CI -- "SSH" --> VM
```

| Piece | Where it is defined |
|---|---|
| API image | [`deploy/api.Dockerfile`](../deploy/api.Dockerfile) |
| Web image (Caddy) | [`deploy/web.Dockerfile`](../deploy/web.Dockerfile), [`deploy/Caddyfile`](../deploy/Caddyfile) |
| The stack | [`deploy/compose.yml`](../deploy/compose.yml) |
| VM setup (run once) | [`deploy/bootstrap.sh`](../deploy/bootstrap.sh) |
| Daily backup | [`deploy/backup.sh`](../deploy/backup.sh), a timer installed by the bootstrap |
| Smoke test (CI, deploys, by hand) | [`deploy/smoke-test.sh`](../deploy/smoke-test.sh) |

### Configuration

The deploy writes these to `/opt/olympus/.env` on the VM, so nothing secret is in the repository:

| Name | Kind | What it is |
|---|---|---|
| `SERVER_ADDRESS` | repository variable | the server's host name, e.g. `203-0-113-7.sslip.io`. Setting it turns the server deploy on, and the game is built to use it |
| `DEPLOY_HOST` | `production` secret | the VM's public IP |
| `DEPLOY_USER` | `production` secret | `olympus` |
| `DEPLOY_SSH_KEY` | `production` secret | the private deploy key |
| `DEPLOY_KNOWN_HOSTS` | `production` secret | the VM's SSH host keys (`ssh-keyscan`) |
| `POSTGRES_PASSWORD` | `production` secret | the database password (letters and digits) |
| `BACKUP_URL` | `production` secret | the bucket's pre-authenticated write URL (ends with `/o/`), optional |
| `ADMIN_TOKEN` | `production` secret | hides world board entries, optional |

`ALLOWED_ORIGINS` is set by the workflow to `https://<owner>.github.io`: only the game's site may call the server from a browser.

### One-time setup

The steps are Slovion's ([its hosting guide](https://github.com/David-Letonja-CTG/Slovion/blob/main/docs/hosting.md#one-time-setup)), with these names:

1. **The VM:** an OCI `VM.Standard.A1.Flex` with Ubuntu 24.04 aarch64 and a public IP. Open ingress TCP 80 and 443 in the VCN's security list. Slovion's VM can't share ports 80 and 443, so use a second VM; Always Free covers 4 OCPUs in total.
2. **The backup bucket** (optional): `olympus-backups`, with a write link (pre-authenticated request).
3. **Prepare the VM:**
   ```bash
   ssh-keygen -t ed25519 -N "" -C olympus-deploy -f olympus-deploy
   scp deploy/bootstrap.sh ubuntu@<ip>:
   ssh ubuntu@<ip> "sudo bash bootstrap.sh '$(cat olympus-deploy.pub)'"
   ```
4. **The GitHub settings:**
   ```bash
   repo=David-Letonja-CTG/Olympus-Unbound
   gh api -X PUT "repos/$repo/environments/production" > /dev/null
   gh secret set DEPLOY_HOST        --env production --repo $repo --body "<ip>"
   gh secret set DEPLOY_USER        --env production --repo $repo --body olympus
   gh secret set DEPLOY_SSH_KEY     --env production --repo $repo < olympus-deploy
   ssh-keyscan -t ed25519,ecdsa,rsa <ip> 2>/dev/null | gh secret set DEPLOY_KNOWN_HOSTS --env production --repo $repo
   openssl rand -hex 24 | gh secret set POSTGRES_PASSWORD --env production --repo $repo
   openssl rand -hex 24 | gh secret set ADMIN_TOKEN       --env production --repo $repo
   gh secret set BACKUP_URL         --env production --repo $repo     # optional; paste the write URL
   gh variable set SERVER_ADDRESS   --repo $repo --body "<ip with dashes>.sslip.io"
   rm olympus-deploy olympus-deploy.pub
   ```
5. **Publish a release.** The server deploys first, with a health check, a smoke test and a rollback on failure. Then the game goes to Pages, built with `https://SERVER_ADDRESS`.

### Operations

- **Logs:** `ssh olympus@<ip> 'cd /opt/olympus && docker compose logs --tail 200 api'`
- **Hide an entry:** `curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://SERVER_ADDRESS/api/admin/scores/<id>/hide`. The id is in `/api/leaderboards/<board>`.
- **Restore a backup:** copy the dump to the VM, then `docker compose exec -T db pg_restore -U olympus -d olympus --clean < file.dump`.
- **Locally:** `cd server && npm run serve` runs the server with boards in memory. Or build the stack as CI does, from the repository root:
  ```bash
  docker build -f deploy/api.Dockerfile -t local/olympus-api:test .
  docker build -f deploy/web.Dockerfile -t local/olympus-web:test .
  docker compose -f deploy/compose.yml --env-file <file with SITE_ADDRESS=:80, POSTGRES_PASSWORD, HTTP_PORT=8088, IMAGE_PREFIX=local, TAG=test> up -d --wait
  bash deploy/smoke-test.sh http://localhost:8088
  ```
- **Downloaded builds:** the zip attached to a release has no server address. Hosted elsewhere, it would be another site, which the server does not allow.
