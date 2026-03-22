# Discovery Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full curated discovery bundle across MCP and CLI, including `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, richer `kb_check` text, better diagnostics logging, docs, and E2E coverage.

**Architecture:** Keep `kb_query` exact, implement free-text search in TypeScript over shared entity loading, and put status/gap/coverage/graph reporting behind curated Prolog predicates with thin MCP and CLI adapters. Update agent guidance and docs to describe a small curated surface instead of a fixed tool count.

**Tech Stack:** TypeScript, Bun, MCP SDK, Commander CLI, SWI-Prolog predicates in `packages/core`, gray-matter, packed E2E tests.

---

### Task 1: Reset the product contract and plan artifacts

**Files:**
- Create: `docs/superpowers/specs/2026-03-22-discovery-bundle-design.md`
- Create: `docs/superpowers/plans/2026-03-22-discovery-bundle.md`
- Modify: `documentation/requirements/REQ-002.md`
- Modify: `documentation/requirements/REQ-013.md`
- Modify: `documentation/facts/FACT-MCP-TOOLSET-CORE-6.md`
- Modify: `documentation/facts/FACT-INFERENCE-SURFACE.md`
- Create or modify: `documentation/requirements/REQ-mcp-search-discovery.md`
- Create or modify: `documentation/scenarios/SCEN-mcp-search-discovery.md`
- Create or modify: `documentation/tests/TEST-mcp-search-discovery.md`
- Create: `documentation/adr/ADR-discovery-tools-public-surface.md`

- [ ] Write the failing docs expectations: fixed-count language should be removed in favor of a curated surface contract.
- [ ] Update or create the requirement/scenario/test artifacts for the discovery bundle.
- [ ] Add links and wording that separate exact lookup from discovery/reporting.
- [ ] Run a focused docs sanity pass by re-reading the modified requirement and ADR files.

---

### Task 2: Add failing MCP tests for the expanded tool surface

**Files:**
- Create: `packages/mcp/tests/tools/search.test.ts`
- Create: `packages/mcp/tests/tools/status.test.ts`
- Create: `packages/mcp/tests/tools/find-gaps.test.ts`
- Create: `packages/mcp/tests/tools/coverage.test.ts`
- Create: `packages/mcp/tests/tools/graph.test.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`
- Modify: `packages/mcp/tests/tools/check-aggregated.test.ts`
- Modify: `packages/mcp/tests/server.test.ts`

- [ ] Add `tools/list` assertions for the expanded allowed set.
- [ ] Add failing `kb_search` tests for metadata hits, markdown hits, type filtering, pagination, deterministic ordering, unreadable markdown fallback, and no code-body search.
- [ ] Add failing `kb_status` tests for branch/snapshot/freshness metadata shape.
- [ ] Add failing `kb_find_gaps`, `kb_coverage`, and `kb_graph` tests for shape and bounded behavior.
- [ ] Add failing `kb_check` text assertions for grouped diagnostics without changing structured output.

Run: `bun test packages/mcp/tests/tools/search.test.ts packages/mcp/tests/tools/status.test.ts packages/mcp/tests/tools/find-gaps.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/graph.test.ts packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts packages/mcp/tests/server.test.ts`

Expected: FAIL on missing tools/handlers or current summary text.

---

### Task 3: Extract shared MCP entity loading and add `kb_search`

**Files:**
- Create: `packages/mcp/src/tools/entity-query.ts`
- Create: `packages/mcp/src/tools/search.ts`
- Modify: `packages/mcp/src/tools/query.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/server/tools.ts`

- [ ] Extract shared type validation, Prolog goal construction, entity loading, and dedupe helpers.
- [ ] Implement `kb_search` with required `query` and optional `type`, `limit`, `offset`.
- [ ] Load markdown body text lazily from repo-local `.md` sources after frontmatter removal.
- [ ] Return deterministic scores, reasons, snippets, and counts.
- [ ] Add `// implements REQ-mcp-search-discovery` traceability comments to new and modified symbols.

Run: `bun test packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/search.test.ts packages/mcp/tests/server.test.ts`

Expected: PASS.

---

### Task 4: Improve `kb_check` text and diagnostics logging

**Files:**
- Modify: `packages/mcp/src/tools/check.ts`
- Modify: `packages/mcp/src/diagnostics.ts`
- Modify: `packages/mcp/src/server/tools.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`
- Modify: `packages/mcp/tests/tools/check-aggregated.test.ts`
- Modify: `packages/mcp/tests/server.test.ts`

- [ ] Change `kb_check` text from a bare count to grouped rule/entity/source/suggestion summaries while preserving structured content.
- [ ] Add server-derived diagnostic fields such as `telemetry_status`, `result_count`, `zero_results`, `violation_count`, `requested_rules`, and `result_summary`.
- [ ] Keep all diagnostic changes additive.

Run: `bun test packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts packages/mcp/tests/server.test.ts`

Expected: PASS.

---

### Task 5: Add curated status and discovery predicates

**Files:**
- Create: `packages/core/src/status.pl`
- Create: `packages/core/src/discovery.pl`
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/core/src/checks.pl` if reuse helpers are needed

- [ ] Add snapshot/status predicates for branch metadata, snapshot identity, freshness state, and dirty detection.
- [ ] Add bulk gap predicates and relationship counting.
- [ ] Add coverage-report predicates that summarize requirement/symbol coverage.
- [ ] Add bounded graph expansion predicates with direction, depth, and truncation limits.

Run: `bun test packages/mcp/tests/tools/status.test.ts packages/mcp/tests/tools/find-gaps.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/graph.test.ts`

Expected: still FAIL until handlers are wired, but Prolog-backed results should now be reachable in targeted handler tests.

---

### Task 6: Add MCP handlers for status, gaps, coverage, and graph

**Files:**
- Create: `packages/mcp/src/tools/status.ts`
- Create: `packages/mcp/src/tools/find-gaps.ts`
- Create: `packages/mcp/src/tools/coverage.ts`
- Create: `packages/mcp/src/tools/graph.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/server/tools.ts`

- [ ] Implement thin adapters over curated Prolog predicates.
- [ ] Keep text outputs concise and structured content stable.
- [ ] Register all new tools in `tools/list`.

Run: `bun test packages/mcp/tests/tools/status.test.ts packages/mcp/tests/tools/find-gaps.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/graph.test.ts packages/mcp/tests/server.test.ts`

Expected: PASS.

---

### Task 7: Add CLI parity commands and tests

**Files:**
- Create: `packages/cli/src/commands/search.ts`
- Create: `packages/cli/src/commands/status.ts`
- Create: `packages/cli/src/commands/gaps.ts`
- Create: `packages/cli/src/commands/coverage.ts`
- Create: `packages/cli/src/commands/graph.ts`
- Modify: `packages/cli/src/cli.ts`
- Create: `packages/cli/tests/commands/search.test.ts`
- Create: `packages/cli/tests/commands/status.test.ts`
- Create: `packages/cli/tests/commands/gaps.test.ts`
- Create: `packages/cli/tests/commands/coverage.test.ts`
- Create: `packages/cli/tests/commands/graph.test.ts`

- [ ] Implement CLI commands mirroring MCP semantics.
- [ ] Reuse shared Prolog/status/discovery logic where possible.
- [ ] Add fixtures and output assertions for JSON and any human-readable mode.

Run: `bun test packages/cli/tests/commands/search.test.ts packages/cli/tests/commands/status.test.ts packages/cli/tests/commands/gaps.test.ts packages/cli/tests/commands/coverage.test.ts packages/cli/tests/commands/graph.test.ts`

Expected: FAIL first, then PASS.

---

### Task 8: Update opencode guidance, references, and release metadata

**Files:**
- Modify: `packages/opencode/src/prompt.ts`
- Modify: `packages/opencode/tests/prompt.test.ts`
- Modify: `packages/opencode/tests/agent-surface-policy.test.ts`
- Modify: `packages/opencode/tests/hook-contract.test.ts`
- Modify: `packages/opencode/README.md`
- Modify: `packages/vscode/README.md`
- Modify: `docs/mcp-reference.md`
- Modify: `docs/cli-reference.md`
- Modify: `docs/inference-rules.md`
- Create: `.changeset/<descriptive-name>.md`

- [ ] Teach agent guidance to use `kb_search` for discovery and `kb_query` for exact follow-up.
- [ ] Replace count-based policy checks with allowed-set guidance.
- [ ] Document new CLI commands and MCP tools.
- [ ] Add changesets for every publishable package touched.

Run: `bun test packages/opencode/tests/prompt.test.ts packages/opencode/tests/agent-surface-policy.test.ts packages/opencode/tests/hook-contract.test.ts`

Expected: PASS.

---

### Task 9: Add parity and E2E coverage

**Files:**
- Create: `documentation/tests/e2e/packed/discovery-bundle.test.ts`
- Modify: `documentation/tests/e2e/packed/helpers.ts`
- Modify: `documentation/tests/e2e/packed/package.json` if new helpers need wiring
- Modify: root `package.json` only if a new test script alias is warranted

- [ ] Add packed E2E coverage for MCP and CLI parity on `status`, `gaps`, `coverage`, and bounded `graph`.
- [ ] Add search E2E coverage for markdown-body search, metadata search, and no-code-body search.
- [ ] Add diagnostic-mode coverage asserting enriched `usage.log` fields.
- [ ] Add freshness-state transitions around sync and workspace edits.

Run: `bun run test:e2e:local`

Expected: PASS.

---

### Task 10: Final verification

**Files:**
- Verify all touched files

- [ ] Run targeted MCP, CLI, and opencode suites.
- [ ] Run E2E locally.
- [ ] Run `bun run build`.
- [ ] Review `git status` for only intended changes.

Run: `bun test packages/mcp/tests packages/cli/tests/commands packages/opencode/tests && bun run test:e2e:local && bun run build`

Expected: PASS.
