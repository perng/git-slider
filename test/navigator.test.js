const test = require("node:test");
const assert = require("node:assert/strict");
const Navigator = require("../navigator.js");

test("parses issue and pull request URLs", () => {
  assert.deepEqual(Navigator.parseGitHubUrl("https://github.com/openai/codex/issues/42#discussion"), {
    owner: "openai",
    repo: "codex",
    kind: "issue",
    number: 42,
    url: "https://github.com/openai/codex/issues/42"
  });
  assert.equal(Navigator.parseGitHubUrl("https://github.com/openai/codex/pull/77/files").kind, "pull");
  assert.equal(Navigator.parseGitHubUrl("https://gitlab.com/openai/codex/issues/42"), null);
  assert.equal(Navigator.parseGitHubUrl("https://github.com/openai/codex/issues"), null);
});

test("builds directional open-item searches", () => {
  const context = Navigator.parseGitHubUrl("https://github.com/openai/codex/issues/42");
  const previous = new URL(Navigator.buildSearchUrl(context, "previous", "2026-01-02T03:04:05Z"));
  const next = new URL(Navigator.buildSearchUrl(context, "next", "2026-01-02T03:04:05Z"));

  assert.equal(previous.pathname, "/openai/codex/issues");
  assert.equal(previous.searchParams.get("q"), "is:issue state:open created:<2026-01-02T03:04:05Z sort:created-desc");
  assert.equal(next.searchParams.get("q"), "is:issue state:open created:>2026-01-02T03:04:05Z sort:created-asc");
});

test("uses the pull request list and qualifier for PRs", () => {
  const context = Navigator.parseGitHubUrl("https://github.com/openai/codex/pull/77");
  const target = new URL(Navigator.buildSearchUrl(context, "next", "2026-05-01T12:00:00Z"));

  assert.equal(target.pathname, "/openai/codex/pulls");
  assert.match(target.searchParams.get("q"), /^is:pr state:open/);
});

test("finds the matching item metadata in nested GitHub data", () => {
  const context = Navigator.parseGitHubUrl("https://github.com/openai/codex/issues/42");
  const payload = {
    props: {
      comments: [{ number: 42, state: "CLOSED", url: "https://github.com/other/repo/issues/42" }],
      issue: {
        number: 42,
        state: "OPEN",
        createdAt: "2026-01-02T03:04:05Z",
        url: "https://github.com/openai/codex/issues/42"
      }
    }
  };

  assert.deepEqual(Navigator.extractMetadataFromJson(payload, context), {
    createdAt: "2026-01-02T03:04:05Z",
    state: "OPEN"
  });
});

test("finds current pull request metadata in GitHub's layout payload", () => {
  const context = Navigator.parseGitHubUrl("https://github.com/microsoft/vscode/pull/328579");
  const payload = {
    payload: {
      pullRequestsLayoutRoute: {
        pullRequest: {
          number: 328579,
          state: "OPEN",
          createdTime: "2026-08-01T18:54:58Z"
        },
        repository: {
          name: "vscode",
          ownerLogin: "microsoft"
        }
      }
    }
  };

  assert.deepEqual(Navigator.extractMetadataFromJson(payload, context), {
    createdAt: "2026-08-01T18:54:58Z",
    state: "OPEN"
  });
});

test("chooses the first same-repository result of the same type", () => {
  const context = Navigator.parseGitHubUrl("https://github.com/openai/codex/issues/42");
  const links = [
    "/openai/codex/pull/43",
    "/other/codex/issues/43",
    "/openai/codex/issues/43",
    "/openai/codex/issues/44"
  ];

  assert.equal(Navigator.pickResultHref(links, context), "https://github.com/openai/codex/issues/43");
});
