# Deploy LaterNest to GitHub

This directory is the privacy-clean public release package for LaterNest.

## 1. Create a GitHub Repository

Create a new public repository on GitHub, for example:

```bash
laternest
```

Recommended repository settings:

- Visibility: Public
- Do not initialize with a README if you will push this folder directly
- Enable Issues only if you want public feedback

## 2. Push This Folder

From this directory:

```bash
git init
git branch -M main
git add .
git commit -m "Publish LaterNest"
git remote add origin git@github.com:<your-username>/laternest.git
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/<your-username>/laternest.git
git push -u origin main
```

## 3. Enable GitHub Pages

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Set **Source** to `Deploy from a branch`.
4. Select branch `main`.
5. Select folder `/docs`.
6. Save.

Your introduction page will be served from:

```text
https://<your-username>.github.io/laternest/
```

## 4. Create a Release Zip

From this directory:

```bash
mkdir -p dist
zip -r dist/laternest-extension.zip . \
  -x ".git/*" \
  -x "dist/*" \
  -x "*.DS_Store"
```

Upload `dist/laternest-extension.zip` to GitHub Releases.

## 5. Privacy Checklist

Before every public push:

```bash
rg -n "open-apis/bot/v2/hook/[A-Za-z0-9_-]{8,}|ghp_|github_pat_|token|secret|password|/Users/|qr\\.png|chrome-storage-export" .
```

The command should not reveal any real secrets or personal data.

## 6. Chrome Install Instructions

Users can install LaterNest by:

1. Downloading the repository or release zip.
2. Opening `chrome://extensions/`.
3. Enabling **Developer mode**.
4. Clicking **Load unpacked**.
5. Selecting the unzipped LaterNest folder.
