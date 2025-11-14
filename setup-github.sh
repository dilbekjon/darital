#!/bin/bash

# GitHub Setup Helper Script
# This script helps you push your project to GitHub

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 GitHub Setup Helper${NC}"
echo "=========================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
fi

# Check git config
if [ -z "$(git config --global user.name)" ]; then
    echo -e "${YELLOW}Git user name is not set.${NC}"
    read -p "Enter your name: " git_name
    git config --global user.name "$git_name"
    echo -e "${GREEN}✓ Git user name set${NC}"
fi

if [ -z "$(git config --global user.email)" ]; then
    echo -e "${YELLOW}Git user email is not set.${NC}"
    read -p "Enter your email (use GitHub email): " git_email
    git config --global user.email "$git_email"
    echo -e "${GREEN}✓ Git user email set${NC}"
fi

echo ""
echo -e "${BLUE}Current Git Configuration:${NC}"
echo "  Name:  $(git config --global user.name)"
echo "  Email: $(git config --global user.email)"
echo ""

# Check if remote is already set
if git remote get-url origin &>/dev/null; then
    echo -e "${GREEN}✓ Remote 'origin' is already set${NC}"
    echo "  URL: $(git remote get-url origin)"
    echo ""
    read -p "Do you want to change it? (y/n): " change_remote
    if [ "$change_remote" != "y" ]; then
        REMOTE_URL=$(git remote get-url origin)
    else
        read -p "Enter your GitHub repository URL: " REMOTE_URL
        git remote set-url origin "$REMOTE_URL"
    fi
else
    echo -e "${YELLOW}No remote repository configured.${NC}"
    echo ""
    echo "To get your repository URL:"
    echo "1. Go to https://github.com"
    echo "2. Create a new repository (or open existing one)"
    echo "3. Copy the repository URL (looks like: https://github.com/username/repo.git)"
    echo ""
    read -p "Enter your GitHub repository URL: " REMOTE_URL
    git remote add origin "$REMOTE_URL"
fi

echo ""
echo -e "${BLUE}Step 1: Adding files...${NC}"
git add .

echo ""
echo -e "${BLUE}Step 2: Committing files...${NC}"
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Initial commit: Darital Final project"
fi
git commit -m "$commit_msg"

echo ""
echo -e "${BLUE}Step 3: Checking branch name...${NC}"
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}Renaming branch from '$current_branch' to 'main'...${NC}"
    git branch -M main
fi

echo ""
echo -e "${BLUE}Step 4: Pushing to GitHub...${NC}"
echo -e "${YELLOW}Note: You may be asked for your GitHub username and password.${NC}"
echo -e "${YELLOW}If asked for password, use a Personal Access Token (not your GitHub password).${NC}"
echo ""
read -p "Press Enter to continue pushing to GitHub..."
git push -u origin main

echo ""
echo -e "${GREEN}✅ Success! Your code has been pushed to GitHub!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Visit your repository: $REMOTE_URL"
echo "2. Set up automatic deployment: See DEPLOYMENT_CI_CD.md"
echo "3. Add GitHub Secrets for CI/CD: See DEPLOYMENT_CI_CD.md"
echo ""

