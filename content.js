(function () {
  "use strict";

  const Navigator = globalThis.GitSliderNavigator;
  const CONTROL_ID = "git-slider-controls";
  const SCAN_BATCH_SIZE = 6;
  const SCAN_LIMIT = 240;
  const neighborCache = new Map();

  let navigating = false;
  let lastPath = location.pathname;
  let renderQueued = false;

  function currentContext() {
    return Navigator.parseGitHubUrl(location.href);
  }

  function icon(direction) {
    const path =
      direction === "previous"
        ? "M10.75 3.75 6.5 8l4.25 4.25"
        : "M5.25 3.75 9.5 8l-4.25 4.25";
    return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function createControls(context) {
    const controls = document.createElement("aside");
    controls.id = CONTROL_ID;
    controls.setAttribute("aria-label", "Git Slider navigation");
    controls.innerHTML = `
      <div class="git-slider__signal" aria-hidden="true"><span></span></div>
      <button type="button" data-direction="previous" aria-label="Previous open ${context.kind}">
        ${icon("previous")}
        <kbd>[</kbd>
      </button>
      <div class="git-slider__identity" aria-hidden="true">
        <span>OPEN</span>
        <strong>${context.kind === "issue" ? "ISSUE" : "PR"}</strong>
      </div>
      <button type="button" data-direction="next" aria-label="Next open ${context.kind}">
        <kbd>]</kbd>
        ${icon("next")}
      </button>
      <div class="git-slider__status" role="status" aria-live="polite"></div>
    `;

    controls.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-direction]");
      if (button) navigate(button.dataset.direction);
    });
    return controls;
  }

  function render() {
    document.getElementById(CONTROL_ID)?.remove();
    const context = currentContext();
    if (!context || !document.body) return;
    document.body.append(createControls(context));
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        neighborCache.clear();
      }
      render();
    });
  }

  function setStatus(message, tone) {
    const controls = document.getElementById(CONTROL_ID);
    if (!controls) return;

    controls.dataset.tone = tone || "neutral";
    controls.querySelector(".git-slider__status").textContent = message;
    controls.querySelectorAll("button").forEach((button) => {
      button.disabled = navigating;
    });
  }

  async function findFromFilteredList(context, direction, createdAt) {
    const response = await fetch(Navigator.buildSearchUrl(context, direction, createdAt), {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const markedTitleLinks = doc.querySelectorAll('a[data-testid="issue-pr-title-link"]');
    const resultLinks = markedTitleLinks.length ? markedTitleLinks : doc.querySelectorAll("a[href]");
    return Navigator.pickResultHref(resultLinks, context);
  }

  async function inspectCandidate(context, number) {
    const url = new URL(Navigator.itemPath(context, number), location.origin).toString();

    try {
      const response = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!response.ok) return null;

      const finalContext = Navigator.parseGitHubUrl(response.url);
      if (!finalContext || finalContext.kind !== context.kind || finalContext.number !== number) return null;

      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const metadata = Navigator.extractMetadataFromDocument(doc, finalContext);
      return metadata?.state === "OPEN" ? finalContext.url : null;
    } catch {
      return null;
    }
  }

  async function findByNumberFallback(context, direction) {
    const step = direction === "previous" ? -1 : 1;

    for (let offset = 1; offset <= SCAN_LIMIT; offset += SCAN_BATCH_SIZE) {
      const candidates = [];
      for (let index = 0; index < SCAN_BATCH_SIZE; index += 1) {
        const distance = offset + index;
        const number = context.number + step * distance;
        if (number > 0 && distance <= SCAN_LIMIT) candidates.push(number);
      }

      if (!candidates.length) return null;
      const results = await Promise.all(candidates.map((number) => inspectCandidate(context, number)));
      const match = results.find(Boolean);
      if (match) return match;
    }

    return null;
  }

  async function findNeighbor(context, direction) {
    const cacheKey = `${context.url}:${direction}`;
    if (neighborCache.has(cacheKey)) return neighborCache.get(cacheKey);

    const metadata = Navigator.extractMetadataFromDocument(document, context);
    let target = null;

    if (metadata?.createdAt) {
      target = await findFromFilteredList(context, direction, metadata.createdAt);
    } else {
      target = await findByNumberFallback(context, direction);
    }

    neighborCache.set(cacheKey, target);
    return target;
  }

  async function navigate(direction) {
    if (navigating || !["previous", "next"].includes(direction)) return;
    const context = currentContext();
    if (!context) return;

    navigating = true;
    setStatus(`Finding ${direction}…`, "loading");

    try {
      const target = await findNeighbor(context, direction);
      if (target) {
        setStatus("Sliding…", "success");
        location.assign(target);
        return;
      }

      setStatus(`No ${direction} open ${context.kind}`, "empty");
    } catch (error) {
      console.warn("Git Slider could not find a neighboring item", error);
      setStatus("Couldn’t reach GitHub", "error");
    } finally {
      navigating = false;
      window.setTimeout(() => setStatus("", "neutral"), 2600);
    }
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      Navigator.isEditableTarget(event.target)
    ) {
      return;
    }

    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      navigate(event.key === "[" ? "previous" : "next");
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "git-slider:get-context") {
      sendResponse({ context: currentContext() });
      return;
    }

    if (message?.type === "git-slider:navigate") {
      const accepted = Boolean(currentContext()) && !navigating;
      if (accepted) navigate(message.direction);
      sendResponse({ accepted });
    }
  });

  document.addEventListener("turbo:load", queueRender);
  document.addEventListener("pjax:end", queueRender);
  window.addEventListener("popstate", queueRender);

  new MutationObserver(() => {
    if (location.pathname !== lastPath) queueRender();
  }).observe(document.documentElement, { childList: true, subtree: true });

  render();
})();
