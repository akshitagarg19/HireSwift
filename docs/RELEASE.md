# HireSwift ATS — Release & Packaging Guide (v1.0)

This document specifies the exact sequence of commands to merge, tag, and package the release.  
**DO NOT PUSH DIRECTLY TO `main`.** Always follow the PR workflow below.

---

## 📋 Pre-Release Verification

Before tagging or creating the release archive, ensure the qualification suite passes cleanly on `ayush/frontend`:

```bash
# Run the release qualification harness
npm run release:check
```
*Expected: 6/6 checks pass (Lint, Build, Unit Tests, Dist Verification, Secrets Scan, Playwright E2E).*

---

## 🚀 Release Execution Steps (For Evaluator / Lead)

### Step 1: Merge PR into `main`
On GitHub, open a Pull Request from `ayush/frontend` into `main`, review changes, and perform a merge commit:
```
Branch: ayush/frontend -> main
Title: feat: full ATS integration, recruiter dashboard, bulk emails, and verification harness
```

### Step 2: Pull Updated `main` Locally
```bash
git checkout main
git pull origin main
```

### Step 3: Create Release Tag `v1.0`
```bash
git tag -a v1.0 -m "Release v1.0: Complete HireSwift ATS Suite for Hackathon Evaluation"
git push origin v1.0
```

### Step 4: Export Clean Release Archive
Generate a clean git archive without uncommitted files, `.env` secrets, or local cache:

```bash
git archive --format=zip --output=HireSwift_Akshita_Ayush.zip v1.0
```

---

## 🧪 Clean-Room Verification (From Archive Alone)

Verify that the generated archive runs cleanly from the [README.md](file:///c:/Users/DELL/HireSwift/README.md) instructions alone without any external dependencies:

### On Windows (PowerShell):
```powershell
# 1. Create a clean temporary directory
mkdir temp_test_release
cd temp_test_release

# 2. Extract the archive
Expand-Archive -Path ..\HireSwift_Akshita_Ayush.zip -DestinationPath .

# 3. Follow the 5-command README quickstart
npm --prefix frontend install
Start-Process node -ArgumentList "frontend/tools/stub-server.mjs"
npm --prefix frontend run dev
# Open http://localhost:5173 to test
```

### On Linux / macOS (Bash):
```bash
mkdir temp_test_release && cd temp_test_release
unzip ../HireSwift_Akshita_Ayush.zip -d .
npm --prefix frontend install
node frontend/tools/stub-server.mjs &
npm --prefix frontend run dev
# Open http://localhost:5173 to test
```

---

## ⚡ Connecting to Live Backend (Akshita's URL)

When Akshita's live backend is running:
```bash
# 1. Run live QA benchmark
QA_MODE=live QA_BASE_URL=<live-backend-url>/api npm run qa

# 2. Start frontend in live mode pointing to the live backend
VITE_USE_MOCK=false VITE_API_URL=<live-backend-url>/api npm --prefix frontend run dev
```
