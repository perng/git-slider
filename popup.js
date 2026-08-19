"use strict";

const controls = [...document.querySelectorAll("button[data-direction]")];
const status = document.getElementById("status");
let activeTab = null;

function setStatus(message, tone) {
  status.textContent = message;
  status.dataset.tone = tone || "neutral";
}

async function send(message) {
  if (!activeTab?.id) return null;
  return chrome.tabs.sendMessage(activeTab.id, message);
}

async function initialize() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id || !activeTab.url?.startsWith("https://github.com/")) return;

  try {
    const response = await send({ type: "git-slider:get-context" });
    const context = response?.context;
    if (!context) return;

    document.getElementById("context-kind").textContent = context.kind === "issue" ? "ISSUE" : "PULL REQUEST";
    document.getElementById("context-repo").textContent = `${context.owner}/${context.repo}`;
    document.getElementById("context-number").textContent = `#${context.number} · open queue`;
    controls.forEach((button) => { button.disabled = false; });
    setStatus("Choose a direction. Closed items are skipped.");
  } catch {
    setStatus("Reload this GitHub tab once to activate Git Slider.", "error");
  }
}

controls.forEach((button) => {
  button.addEventListener("click", async () => {
    controls.forEach((control) => { control.disabled = true; });
    setStatus(`Finding the ${button.dataset.direction} open item…`, "working");

    try {
      const response = await send({
        type: "git-slider:navigate",
        direction: button.dataset.direction
      });
      if (!response?.accepted) throw new Error("Navigation unavailable");
      window.close();
    } catch {
      controls.forEach((control) => { control.disabled = false; });
      setStatus("Couldn’t start navigation. Reload the GitHub tab.", "error");
    }
  });
});

document.getElementById("shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

initialize();
