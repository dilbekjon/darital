# CI/CD deploy pipeline (build in CI, pull on server)

**Goal:** stop building Docker images on the VPS. CI builds + pushes images to a
registry; the server just pulls and runs them. Deploys go from ~20 min to ~30 sec
and never compete with the live app.

Two ready-to-use options are included. **GitLab is recommended** (built-in registry
+ CI, no personal access tokens needed).

- GitLab: `.gitlab-ci.yml`
- GitHub: `.github/workflows/deploy.yml`
- Shared: `docker-compose.registry.yml` (server pulls images via `API_IMAGE` /
  `TENANT_IMAGE` / `ADMIN_IMAGE` env vars set by whichever CI runs).

How it flows (both): push to `main` → CI builds 4 images (api, tenant,
admin-staging, admin-prod) with layer caching → **staging deploys
automatically**; **production is one-click manual**.

---

## ▶ GitLab setup (recommended)

### 1. Move the repo to GitLab
Create a project at `gitlab.com/<you>/darital`, then from this repo:
```
git remote add gitlab git@gitlab.com:<you>/darital.git
git push gitlab main
```
(GitLab's Container Registry is enabled by default on gitlab.com.)

### 2. Deploy token (lets the VPS pull images)
Project → Settings → Repository → **Deploy tokens** → create one with
`read_registry` scope. Note its username + token.

### 3. CI/CD variables  (Project → Settings → CI/CD → Variables)
| Variable | Value | Flags |
|---|---|---|
| `DEPLOY_HOST` | `46.8.194.218` | |
| `DEPLOY_USER` | `ubuntu` | |
| `DEPLOY_SSH_KEY` | the **private** deploy key | masked, protected |
| `CI_DEPLOY_USER` | the deploy-token **username** | |
| `CI_DEPLOY_PASSWORD` | the deploy-token **value** | masked, protected |

(The build job authenticates to the registry automatically via the job token —
no PAT needed.)

### 4. One-time on the server
```
sudo usermod -aG docker ubuntu          # let the deploy user run docker
```
The SSH **public** deploy key is already installed in `ubuntu`'s `authorized_keys`.
Get the private key to paste into `DEPLOY_SSH_KEY`:
```
cat /tmp/darital_deploy        # (on your Mac; or wherever it was generated)
```

That's it — push to `main` → staging auto-deploys; for production use
CI/CD → Pipelines → run the manual `deploy:production` job.

---

## ▶ GitHub alternative
If you stay on GitHub instead: add repo secrets `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY`, `GHCR_PULL_TOKEN` (PAT with `read:packages`), plus the same
`usermod -aG docker ubuntu` on the server. Workflow: `.github/workflows/deploy.yml`.

---

## Safety
- The existing build-on-server compose files still work unchanged — this is additive.
  Cut over once you see one green pipeline.
- Migrations still run on api startup (`prisma migrate deploy`).
- Roll back by deploying an older commit SHA (images are tagged by SHA).
- `docker-compose.registry.yml` must be present in `/srv/darital-prod` and
  `/srv/darital-staging` (ships with the repo).
