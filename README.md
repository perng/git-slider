# Git Slider

Git Slider is a small Chrome extension for moving through a repository's open GitHub issues or pull requests without returning to the list.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Reload any GitHub tabs that were already open.

## Use it

Open an issue at `github.com/OWNER/REPO/issues/NUMBER` or a pull request at `github.com/OWNER/REPO/pull/NUMBER`, then use any of these controls:

- Press `[` for the previous open item or `]` for the next open item.
- Click the small Git Slider control in the lower-right corner of the page.
- Open the extension popup and click **Older** or **Newer**.
- Use `Alt+Shift+Left` or `Alt+Shift+Right`. These can be changed at `chrome://extensions/shortcuts`.

Navigation stays in the current repository and item type. Closed issues and closed or merged pull requests are skipped. “Previous” means the nearest older open item; “next” means the nearest newer open item.

## Privacy and access

Git Slider makes requests only to GitHub while you use a navigation control. It uses your existing signed-in GitHub session, so it works with private repositories you can already view. It does not collect data, use analytics, require an API token, or send repository information anywhere else.

## Development

The extension uses Manifest V3 and has no build step or runtime dependencies.

```sh
npm test
```
