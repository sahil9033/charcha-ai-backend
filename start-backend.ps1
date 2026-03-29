#!/usr/bin/env pwsh
# Charcha AI Backend Startup Script - PowerShell Version

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Charcha AI Backend - Starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

cd "c:\Users\dell\OneDrive\Documents\charcha ai\backend"

Write-Host "Verifying npm is installed..." -ForegroundColor Cyan
npm --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm not found. Install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend server..." -ForegroundColor Yellow
Write-Host "Server will listen on: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

npm start

