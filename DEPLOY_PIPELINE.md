# CI/CD deploy pipeline (build in GitHub, pull on server)

**Goal:** stop building Docker images on the VPS. GitHub Actions builds + pushes
images to GHCR; the server just pulls and runs them. Deploys go from ~20 min to
~30 sec and never compete with the live app.

## How it works
1. Push to `main` → GitHub Actions builds 4 images (api, tenant, admin-staging,
   admin-prod) with layer caching and pushes them to GHCR.
2. The `deploy` job SSHes into the VPS and runs `docker compose pull && up -d`
   using `docker-compose.registry.yml` (which points services at the GHCR images).
3. **Staging deploys automatically** on push to `main`.
   **Production is manual:** Actions → "Build & Deploy" → Run workflow →
   environment = `production`.

## One-time setup (things only you can do on GitHub)

### 1. GitHub repo secrets  (Settings → Secrets and variables → Actions)
| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `46.8.194.218` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | the **private** SSH deploy key (see step 2) |
| `GHCR_PULL_TOKEN` | a GitHub PAT (classic) with `read:packages` — lets the VPS pull the images |

### 2. SSH deploy key
Generate a key pair, put the **public** key in the server's
`/home/ubuntu/.ssh/authorized_keys`, and paste the **private** key into the
`DEPLOY_SSH_KEY` secret. (I can generate it and install the public key on the
server for you — just say so.)

### 3. GHCR image visibility
After the first successful CI run, the packages appear under your GitHub account.
Either keep them private (the `GHCR_PULL_TOKEN` handles pulls) or set them public
(Package → Settings → make public) to drop the token requirement.

### 4. Let the deploy user run docker without sudo (one-time, on the server)
The CI deploy runs `docker compose` as `ubuntu`. Grant docker access once:
```
sudo usermod -aG docker ubuntu
```
(The SSH deploy public key is already installed in `ubuntu`'s `authorized_keys`.)

### 5. Make sure `docker-compose.registry.yml` is on the server
It ships in the repo. Pull it into `/srv/darital-prod` and `/srv/darital-staging`
(or let the first git pull / deploy place it).

## Safety
- The existing build-on-server compose files still work unchanged — this pipeline
  is additive. You can cut over when you've seen one green run.
- Migrations still run on api startup (`prisma migrate deploy`), same as today.
- Roll back by re-running the workflow against an older commit SHA (images are
  tagged by SHA).
