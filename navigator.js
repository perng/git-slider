(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.GitSliderNavigator = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ITEM_PATH = /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)(?:\/.*)?$/;

  function parseGitHubUrl(value) {
    let url;

    try {
      url = new URL(value, "https://github.com");
    } catch {
      return null;
    }

    if (url.hostname !== "github.com") return null;

    const match = url.pathname.match(ITEM_PATH);
    if (!match) return null;

    return {
      owner: decodeURIComponent(match[1]),
      repo: decodeURIComponent(match[2]),
      kind: match[3] === "issues" ? "issue" : "pull",
      number: Number(match[4]),
      url: `${url.origin}/${match[1]}/${match[2]}/${match[3]}/${match[4]}`
    };
  }

  function itemPath(context, number) {
    const segment = context.kind === "issue" ? "issues" : "pull";
    return `/${encodeURIComponent(context.owner)}/${encodeURIComponent(context.repo)}/${segment}/${number}`;
  }

  function buildSearchUrl(context, direction, createdAt) {
    if (!context || !["previous", "next"].includes(direction)) return null;

    const listSegment = context.kind === "issue" ? "issues" : "pulls";
    const type = context.kind === "issue" ? "issue" : "pr";
    const comparison = direction === "previous" ? "<" : ">";
    const sort = direction === "previous" ? "created-desc" : "created-asc";
    const query = `is:${type} state:open created:${comparison}${createdAt} sort:${sort}`;
    const url = new URL(`https://github.com/${context.owner}/${context.repo}/${listSegment}`);
    url.searchParams.set("q", query);
    return url.toString();
  }

  function metadataMatches(value, context) {
    if (!value || typeof value !== "object") return false;
    if (Number(value.number) !== context.number) return false;

    const candidateUrl = value.url || value.htmlUrl || value.permalink;
    if (typeof candidateUrl !== "string") return false;

    const parsed = parseGitHubUrl(candidateUrl);
    return Boolean(
      parsed &&
        parsed.owner.toLowerCase() === context.owner.toLowerCase() &&
        parsed.repo.toLowerCase() === context.repo.toLowerCase() &&
        parsed.kind === context.kind &&
        parsed.number === context.number
    );
  }

  function pullRequestContainerMetadata(value, context) {
    if (context.kind !== "pull" || !value?.pullRequest || !value?.repository) return null;

    const pullRequest = value.pullRequest;
    const repository = value.repository;
    const owner = repository.ownerLogin || repository.owner?.login;
    const repo = repository.name;

    if (
      Number(pullRequest.number) !== context.number ||
      String(owner).toLowerCase() !== context.owner.toLowerCase() ||
      String(repo).toLowerCase() !== context.repo.toLowerCase()
    ) {
      return null;
    }

    return {
      createdAt: pullRequest.createdTime || pullRequest.createdAt || pullRequest.created_at || null,
      state: typeof pullRequest.state === "string" ? pullRequest.state.toUpperCase() : null
    };
  }

  function findMetadata(value, context, seen) {
    if (!value || typeof value !== "object") return null;
    if (seen.has(value)) return null;
    seen.add(value);

    const pullRequestMetadata = pullRequestContainerMetadata(value, context);
    if (pullRequestMetadata?.createdAt || pullRequestMetadata?.state) return pullRequestMetadata;

    if (metadataMatches(value, context)) {
      const createdAt = value.createdTime || value.createdAt || value.created_at;
      const state = typeof value.state === "string" ? value.state.toUpperCase() : null;

      if (createdAt || state) return { createdAt: createdAt || null, state };
    }

    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const result = findMetadata(child, context, seen);
      if (result) return result;
    }

    return null;
  }

  function extractMetadataFromJson(value, context) {
    return findMetadata(value, context, new WeakSet());
  }

  function extractMetadataFromDocument(doc, context) {
    const scripts = doc.querySelectorAll('script[type="application/json"]');

    for (const script of scripts) {
      try {
        const metadata = extractMetadataFromJson(JSON.parse(script.textContent), context);
        if (metadata) return metadata;
      } catch {
        // GitHub occasionally includes an incomplete streamed JSON block. Ignore it.
      }
    }

    const relativeTime = doc.querySelector(
      '[data-testid="issue-body-header-link"] relative-time[datetime], .gh-header-meta relative-time[datetime], div[id^="pullrequest-"] .timeline-comment-header relative-time[datetime]'
    );
    const openState = doc.querySelector(
      '[data-testid="header-state"] .octicon-issue-opened, [data-pull-is-open="true"], [data-status="pullOpened"]'
    );
    return relativeTime || openState
      ? {
          createdAt: relativeTime?.getAttribute("datetime") || null,
          state: openState ? "OPEN" : null
        }
      : null;
  }

  function pickResultHref(links, context) {
    for (const link of links) {
      const href = typeof link === "string" ? link : link.getAttribute("href");
      if (!href) continue;

      const parsed = parseGitHubUrl(href);
      if (
        parsed &&
        parsed.owner.toLowerCase() === context.owner.toLowerCase() &&
        parsed.repo.toLowerCase() === context.repo.toLowerCase() &&
        parsed.kind === context.kind &&
        parsed.number !== context.number
      ) {
        return parsed.url;
      }
    }

    return null;
  }

  function isEditableTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], .CodeMirror, .monaco-editor'
      )
    );
  }

  return {
    buildSearchUrl,
    extractMetadataFromDocument,
    extractMetadataFromJson,
    isEditableTarget,
    itemPath,
    parseGitHubUrl,
    pickResultHref
  };
});
