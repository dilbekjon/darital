# GitHub Setup Guide

This guide will help you push your Darital project to GitHub.

## 📋 Prerequisites

1. **GitHub Account** - If you don't have one, create it at [github.com](https://github.com)
2. **Git Installed** - Usually comes with macOS/Linux, or download from [git-scm.com](https://git-scm.com)

## 🚀 Step-by-Step Guide

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `darital-final` (or any name you like)
   - **Description**: "Darital Final - Property Management System"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** check "Initialize with README" (we already have files)
   - **DO NOT** add .gitignore or license (we already have them)
4. Click **"Create repository"**

### Step 2: Copy Repository URL

After creating the repository, GitHub will show you a page with setup instructions. You'll see a URL like:

```
https://github.com/yourusername/darital-final.git
```

**Copy this URL** - you'll need it in the next steps.

### Step 3: Configure Git (First Time Only)

If this is your first time using Git on this computer:

```bash
# Set your name
git config --global user.name "Your Name"

# Set your email (use the email associated with your GitHub account)
git config --global user.email "your.email@example.com"
```

### Step 4: Add and Commit Files

Run these commands in your project directory:

```bash
# Add all files
git add .

# Commit with a message
git commit -m "Initial commit: Darital Final project"
```

### Step 5: Connect to GitHub and Push

```bash
# Add GitHub repository as remote (replace with YOUR repository URL)
git remote add origin https://github.com/yourusername/darital-final.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note**: You'll be asked for your GitHub username and password. 
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your GitHub password)

### Step 6: Create Personal Access Token (If Needed)

If Git asks for a password, you need to create a Personal Access Token:

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Give it a name: "Darital Deployment"
4. Select scopes: Check **`repo`** (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when Git asks

## 🔄 Making Changes and Pushing Updates

After making changes to your code:

```bash
# Check what changed
git status

# Add changed files
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## 🔐 Using SSH Instead of HTTPS (Optional, More Secure)

If you prefer SSH (no password needed after setup):

### 1. Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one if you want)
```

### 2. Add SSH Key to GitHub

```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
# Copy the entire output
```

Then:
1. Go to GitHub → **Settings** → **SSH and GPG keys**
2. Click **"New SSH key"**
3. Paste your key
4. Click **"Add SSH key"**

### 3. Change Remote URL to SSH

```bash
git remote set-url origin git@github.com:yourusername/darital-final.git
```

Now you can push without entering password!

## ✅ Verify Everything Works

After pushing, go to your GitHub repository page. You should see all your files there!

## 🆘 Troubleshooting

### "Repository not found" Error

- Make sure the repository URL is correct
- Check that you have access to the repository
- Verify your GitHub username is correct

### "Permission denied" Error

- Make sure you're using the correct username
- Use Personal Access Token instead of password
- Or set up SSH keys

### "Large files" Warning

If you have large files (like videos, large images), Git might warn you. You can:
- Remove them from git: `git rm --cached large-file.mp4`
- Add them to `.gitignore`
- Use Git LFS for large files

## 📚 Next Steps

After pushing to GitHub:

1. **Set up automatic deployment** - Follow `DEPLOYMENT_CI_CD.md`
2. **Add collaborators** - Go to repository → Settings → Collaborators
3. **Create branches** - For feature development:
   ```bash
   git checkout -b feature-name
   # Make changes
   git push -u origin feature-name
   ```

## 🎉 You're Done!

Your code is now on GitHub! You can:
- View it online at `https://github.com/yourusername/darital-final`
- Share it with others
- Set up automatic deployment
- Track changes and collaborate

