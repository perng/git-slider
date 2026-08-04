# Chrome Web Store privacy disclosures

## Single purpose

Git Slider lets a user move directly to the nearest previous or next open GitHub issue or pull request in the same repository and item type.

## Permission justifications

### activeTab

Used when the user opens the Git Slider toolbar popup so the popup can identify the active GitHub issue or pull-request tab and send the user’s requested navigation command to the page. Access is temporary and initiated by the user.

### Host access to GitHub issue and pull-request pages

Required to display the compact navigation controls on GitHub issue and pull-request detail pages, read the current repository/item metadata, request GitHub’s filtered open-item lists, and navigate to the user-selected neighboring item. The extension does not run on unrelated websites.

## Remote code

No. All executable code is included in the extension package. The extension does not download or execute remote code.

## Data handling disclosure

The extension temporarily handles website content and browsing activity that are necessary for its user-facing navigation feature: the current GitHub URL, repository, issue or pull-request number, item state, creation timestamp, and filtered GitHub result links.

This information is processed locally in the browser and is not transmitted to the developer. Requests are sent only to github.com over HTTPS to retrieve the GitHub pages needed for navigation. No data is sold, used for advertising, used for profiling, retained after the page session, or shared with unrelated third parties.

## Limited Use certification

The extension’s use of information is limited to providing its single purpose and complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
