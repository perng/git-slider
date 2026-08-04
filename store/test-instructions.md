# Reviewer test instructions

No account or test credentials are required.

1. Install the extension.
2. Open a public, open GitHub issue such as https://github.com/isaacs/github/issues/366.
3. Confirm the Git Slider navigation rail appears in the lower-right corner.
4. Press ] or click the right arrow. The extension opens the nearest newer open issue in the same repository, skipping closed issues.
5. Press [ or click the left arrow to navigate to the nearest older open issue.
6. Open a public GitHub pull request and repeat the test. Navigation remains within pull requests and skips closed or merged PRs.
7. Click the Git Slider toolbar icon to verify the popup navigation controls.

The extension also defines Alt+Shift+Left and Alt+Shift+Right commands. Chrome may require these to be assigned or adjusted at chrome://extensions/shortcuts if they conflict with an existing browser or operating-system shortcut.

For private repositories, the extension uses the reviewer’s existing GitHub session and never requests a token or separate login.
