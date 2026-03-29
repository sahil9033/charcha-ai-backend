#!/usr/bin/env pwsh
# Charcha AI Backend - GitHub Deployment Script
# Run this AFTER you have installed Git and created GitHub repository

Write-Host "===========================================" -ForegroundColor Green
Write-Host "Charcha AI Backend - GitHub Deployment" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "✓ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git not found. Please install from https://git-scm.com/download/win" -ForegroundColor Red
    Write-Host "Then restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Configure Git User" -ForegroundColor Cyan
$email = Read-Host "Enter your GitHub email"
$name = Read-Host "Enter your name"

git config --global user.email $email
git config --global user.name $name

Write-Host "✓ Git configured" -ForegroundColor Green
Write-Host ""

# Navigate to backend folder
Write-Host "Step 2: Navigate to Backend Folder" -ForegroundColor Cyan
$backendPath = "c:\Users\dell\OneDrive\Documents\charcha ai\backend"
cd $backendPath
Write-Host "✓ In folder: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Initialize git
Write-Host "Step 3: Initialize Repository" -ForegroundColor Cyan
git init
git branch -M main
Write-Host "✓ Repository initialized" -ForegroundColor Green
Write-Host ""

# Add files
Write-Host "Step 4: Add Files" -ForegroundColor Cyan
git add .
Write-Host "✓ Files staged" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "Step 5: Create Commit" -ForegroundColor Cyan
git commit -m "Initial commit - Charcha AI Backend with emotional response system"
Write-Host "✓ Committed" -ForegroundColor Green
Write-Host ""

# Add remote
Write-Host "Step 6: Add GitHub Remote" -ForegroundColor Cyan
Write-Host "Go to https://github.com/new and create 'charcha-ai-backend' repository" -ForegroundColor Yellow
$githubUrl = Read-Host "Paste your GitHub repo URL (https://github.com/USERNAME/charcha-ai-backend.git)"

git remote add origin $githubUrl
Write-Host "✓ Remote added" -ForegroundColor Green
Write-Host ""

# Push to GitHub
Write-Host "Step 7: Push to GitHub" -ForegroundColor Cyan
Write-Host "This may ask for GitHub authentication..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Pushed to GitHub successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "NEXT STEPS:" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Go to https://render.com" -ForegroundColor Yellow
    Write-Host "2. Click 'New +' → 'Web Service'" -ForegroundColor Yellow
    Write-Host "3. Select your charcha-ai-backend repository" -ForegroundColor Yellow
    Write-Host "4. Configure:" -ForegroundColor Yellow
    Write-Host "   - Name: charcha-ai-backend" -ForegroundColor Yellow
    Write-Host "   - Build: npm install" -ForegroundColor Yellow
    Write-Host "   - Start: npm start" -ForegroundColor Yellow
    Write-Host "5. Add env var:" -ForegroundColor Yellow
    Write-Host "   - OPENROUTER_API_KEY = your_api_key" -ForegroundColor Yellow
    Write-Host "6. Click 'Create Web Service'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✓ Backend deployment complete!" -ForegroundColor Green
} else {
    Write-Host "✗ Push failed. Check errors above." -ForegroundColor Red
}
