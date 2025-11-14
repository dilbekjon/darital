# CI/CD Setup Guide

This guide explains how to set up automatic deployment using GitHub Actions.

## 🔧 Prerequisites

1. **GitHub Repository** - Your code should be in a GitHub repository
2. **SSH Access** - You need SSH access to your server
3. **SSH Key** - Generate an SSH key pair for deployment

## 📝 Step 1: Generate SSH Key for Deployment

On your local machine:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "deploy@darital" -f ~/.ssh/darital_deploy

# This creates:
# - ~/.ssh/darital_deploy (private key)
# - ~/.ssh/darital_deploy.pub (public key)
```

## 🔐 Step 2: Add SSH Key to Server

### 2.1 Copy Public Key to Server

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/darital_deploy.pub username@your-server-ip

# Or manually:
cat ~/.ssh/darital_deploy.pub | ssh username@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 2.2 Test SSH Connection

```bash
ssh -i ~/.ssh/darital_deploy username@your-server-ip
```

## 🔑 Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Secrets:

- **`SERVER_HOST`**: Your server IP or domain (e.g., `123.456.789.0` or `yourdomain.uz`)
- **`SERVER_USER`**: SSH username (e.g., `root` or `ubuntu`)
- **`SERVER_SSH_KEY`**: Your private SSH key content (copy from `~/.ssh/darital_deploy`)

### How to get SSH Key content:

```bash
cat ~/.ssh/darital_deploy
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

## 🚀 Step 4: Configure GitHub Actions Workflow

The workflow file is already created at `.github/workflows/deploy.yml`. 

### 4.1 Update Branch Name

If your main branch is not `main`, edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main  # Change to 'master' or your branch name
```

### 4.2 Update Server Path (if different)

If your project is in a different directory, update the script in `.github/workflows/deploy.yml`:

```yaml
script: |
  cd /var/www/darital  # Change if your path is different
  # ... rest of the script
```

## ✅ Step 5: Test Deployment

### 5.1 Manual Trigger

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Deploy to Production** workflow
4. Click **Run workflow** → **Run workflow**

### 5.2 Automatic Trigger

Push to your main branch:

```bash
git add .
git commit -m "Test deployment"
git push origin main
```

The workflow will automatically trigger!

## 📊 Step 6: Monitor Deployments

1. Go to **Actions** tab in GitHub
2. Click on a workflow run to see:
   - Build logs
   - Deployment progress
   - Any errors

## 🔄 Alternative: Using Deployment Script

If you prefer manual deployment or want to deploy from your local machine:

### Option A: Deploy from Local Machine

```bash
# Make script executable
chmod +x deploy.sh

# Copy script to server
scp deploy.sh username@your-server-ip:/var/www/darital/

# SSH into server and run
ssh username@your-server-ip
cd /var/www/darital
./deploy.sh
```

### Option B: Deploy via SSH from Local

```bash
# From your local machine
ssh username@your-server-ip "cd /var/www/darital && git pull && pnpm install && pnpm build && pm2 restart all"
```

## 🛠️ Advanced: Custom Deployment Script

You can customize the deployment script in `.github/workflows/deploy.yml`:

```yaml
script: |
  cd /var/www/darital
  git pull origin main
  pnpm install --frozen-lockfile
  pnpm build
  
  # Run database migrations
  cd apps/api
  pnpm prisma:generate
  pnpm prisma:migrate deploy
  cd ../..
  
  # Restart services
  pm2 restart all
  
  # Run any custom commands
  # npm run seed  # Example: seed database
  # npm run cache:clear  # Example: clear cache
```

## 🔍 Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**:
   - Go to Actions → Click on failed workflow → Check logs

2. **Check SSH connection**:
   ```bash
   ssh -i ~/.ssh/darital_deploy username@your-server-ip
   ```

3. **Check server logs**:
   ```bash
   pm2 logs
   tail -f /var/www/darital/logs/api-error.log
   ```

### Common Issues

**Issue**: "Permission denied (publickey)"
- **Solution**: Make sure SSH key is added to GitHub secrets correctly

**Issue**: "Command not found: pnpm"
- **Solution**: Install pnpm on server: `npm install -g pnpm`

**Issue**: "PM2 not found"
- **Solution**: Install PM2 on server: `npm install -g pm2`

**Issue**: "Database migration fails"
- **Solution**: Check database connection in `.env` file

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SSH Key Setup Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

## ✅ Checklist

- [ ] SSH key generated
- [ ] SSH key added to server
- [ ] GitHub secrets configured
- [ ] Workflow file updated with correct branch/path
- [ ] Test deployment successful
- [ ] Automatic deployment working

