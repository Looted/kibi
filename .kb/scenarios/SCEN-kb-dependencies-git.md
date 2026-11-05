---
title: A project reads a pinned KB dependency from git without touching its own KB
status: active
origin:
  kind: agent
  recorded_at: '2026-11-04T10:42:06.010Z'
id: SCEN-kb-dependencies-git
type: scenario
---
Steps:

1. Declare a dependency in `.kb/dependencies.json` with a git URL and a tag,
   branch or commit, and run `kibi deps status`: it lists the dependency as
   not locked and exits 1.
2. Run `kibi deps lock`: it resolves the ref to a commit, fetches that commit
   into the shared dependency cache as a detached checkout, reads its KB
   schema and writes `.kb/dependencies.lock.json`. Running it again keeps the
   pin; `--update` or naming the dependency moves it to the ref's new commit.
3. Run `kibi search --kb <name> <question>`, or `kb_search` with `kb` over MCP:
   the answer comes from the dependency's own read-only store at the pinned
   commit, the diagnostics name the dependency, and the project's branch store
   and tracked files are unchanged.
4. On another machine with the same lock file, `kibi deps fetch` downloads the
   same commit, and reads answer the same way.
