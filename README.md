# LaterNest

LaterNest is a local-first Chrome extension for saving web pages into a calm, reviewable reading queue.

It is designed for people who collect useful links throughout the day but want a cleaner way to return, triage, and actually read them later.

## What It Does

- Save the current tab with title, URL, domain, category, note, and reminder time.
- Organize saved links by Work, Study, and Fun.
- Review links in a lightweight dashboard with Timeline and Week views.
- Search, filter, favorite, complete, postpone, restore, and delete saved links.
- Use bulk actions to clean up multiple links at once.
- Optionally send unsynced pending links to a Feishu/Lark webhook that you configure locally.

## Privacy First

LaterNest does not run a backend server and does not include an account system.

By default, your saved links and settings stay in your own browser through `chrome.storage.local`.

Optional Feishu/Lark sync is only triggered if you add your own webhook URL in the extension settings. That webhook URL is stored locally in your browser and is not sent to this repository owner.

Read the full privacy note in [PRIVACY.md](./PRIVACY.md).

## Install From Source

1. Download or clone this repository.
2. Open Chrome and visit `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository folder.

Chrome will load the extension locally.

## Permissions

LaterNest requests these permissions:

- `tabs`: read the active tab title and URL when you save a page.
- `storage`: store todos and settings locally in Chrome.
- `alarms`: schedule reminders and optional daily sync.
- `notifications`: show local reminder notifications.
- `host_permissions` for `https://open.feishu.cn/*`: send data to your own Feishu/Lark webhook when configured.

## Public Demo Page

If GitHub Pages is enabled for this repository, the product introduction page lives in [`docs/index.html`](./docs/index.html).

The demo page is static and does not contain personal saved links.

## Release Checklist

Before publishing a new version:

- Check that no real webhook URL is committed.
- Check that no personal browsing history or exported `chrome.storage` data is committed.
- Keep screenshots anonymized or use fictional sample data.
- Update `manifest.json` version.
- Zip the extension folder for GitHub Releases if desired.

## Project Status

LaterNest is a personal MVP that is useful today, but still intentionally small:

- No cloud sync.
- No account system.
- No article body scraping.
- No analytics.
- No remote database.

That restraint is part of the product philosophy.
