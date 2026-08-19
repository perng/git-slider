"use strict";

chrome.commands.onCommand.addListener(async (command) => {
  const directions = {
    "previous-open-item": "previous",
    "next-open-item": "next"
  };
  const direction = directions[command];
  if (!direction) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "git-slider:navigate", direction });
  } catch {
    // The active tab is not a supported GitHub issue or pull request page.
  }
});
