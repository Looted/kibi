# MCP Search and Diagnostics Implementation Plan

> **Archival note:** Agent operating guidance now lives in bundled Kibi skills (`kibi-usage`, `init-kibi`). Historical mentions of `docs/prompts/llm-rules.md` and `docs/prompts/retroactive-init.md` below are not current runbooks.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one new public discovery tool, `kb_search`, while keeping `kb_query` precise, making `kb_check` much more actionable, and making `usage.log` good enough to measure whether Kibi is being used as intended.

**Architecture:** `kb_search` should stay in `packages/mcp` and build on existing KB entity retrieval rather than changing KB storage. For v1, search metadata from the KB plus markdown body text loaded on demand from documentation-backed entity source files; do not index or search raw code files. Keep `kb_query` deterministic and exact, improve `kb_check` text output without breaking structured output, and add server-derived diagnostic fields so usage logs remain useful even when clients omit telemetry.

**Tech Stack:** TypeScript, MCP server, Prolog-backed entity retrieval, `gray-matter`, Bun tests.

---

## Task 1: Lock the Product Contract First

**Files:**
- Create: `documentation/requirements/REQ-mcp-search-discovery.md`
- Create: `documentation/scenarios/SCEN-mcp-search-discovery.md`
- Create: `documentation/tests/TEST-mcp-search-discovery.md`
- Modify: `documentation/requirements/REQ-002.md`
- Modify: `documentation/requirements/REQ-013.md`
- Modify: `documentation/facts/FACT-MCP-TOOLSET-CORE-6.md`
- Modify: `documentation/tests/TEST-010.md`
- Modify: `docs/mcp-reference.md`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `docs/inference-rules.md`
- Modify: `docs/prompts/retroactive-init.md`

- [ ] Define `kb_search` as the only new public MCP tool.
- [ ] Update "four-tool" language to "small public MCP surface" plus the current five tools.
- [ ] Make `kb_search` explicitly for exploratory discovery, and keep `kb_query` as exact/faceted retrieval.
- [ ] Add traceability targets early so new code can use `// implements REQ-mcp-search-discovery`.

**Key decision to preserve:** do not expand storage or sync schema just to support search v1.

---

## Task 2: Add Failing Tool-Surface and Search Tests

**Files:**
- Create: `packages/mcp/tests/tools/search.test.ts`
- Modify: `packages/mcp/tests/server.test.ts`
- Modify: `packages/opencode/tests/prompt.test.ts`
- Modify: `packages/opencode/tests/hook-contract.test.ts`
- Modify: `packages/opencode/tests/agent-surface-policy.test.ts`

- [ ] Add `tools/list` coverage expecting `kb_search` in `packages/mcp/tests/server.test.ts:219`.
- [ ] Add `kb_search` tests for:
  - exact ID/title matches
  - tag/metadata matches
  - markdown body matches
  - type-filtered search
  - deterministic ordering and pagination
  - unreadable/missing markdown source fallback
  - no raw code-body searching from `.ts` / `.py` sources
- [ ] Update OpenCode prompt tests to mention `kb_search` for discovery and `kb_query` for exact lookup.

**Suggested commands:**
```bash
bun test packages/mcp/tests/tools/search.test.ts
bun test packages/mcp/tests/server.test.ts
bun test packages/opencode/tests/prompt.test.ts packages/opencode/tests/hook-contract.test.ts packages/opencode/tests/agent-surface-policy.test.ts
```

---

## Task 3: Implement `kb_search` in MCP

**Files:**
- Create: `packages/mcp/src/tools/search.ts`
- Create: `packages/mcp/src/tools/entity-query.ts` or equivalent shared helper
- Modify: `packages/mcp/src/tools/query.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/server/tools.ts`

- [ ] Extract shared entity-loading logic from `packages/mcp/src/tools/query.ts` so `kb_query` and `kb_search` do not duplicate retrieval/parsing code.
- [ ] Implement `kb_search` schema with:
  - required `query`
  - optional `type`
  - optional `limit`
  - optional `offset`
- [ ] Search these sources only:
  - KB entity metadata: `id`, `title`, `tags`, `type`, `source`, `owner`, `priority`, `severity`
  - markdown body text from repo-local `.md` sources after frontmatter removal
- [ ] Do not search raw code file contents.
- [ ] Normalize source references like `brief.md#4.2` before reading.
- [ ] Use deterministic ranking:
  - strongest: exact ID/title phrase
  - then title/tag/token coverage
  - then markdown body matches
  - stable tie-breakers by score, type, ID
- [ ] Return short snippets/match reasons in structured content so agents know why a result matched.
- [ ] Add traceability comments on new/modified functions for `REQ-mcp-search-discovery`.

**Implementation note:** `packages/mcp/package.json:10` already has `gray-matter`, so no new parsing dependency is needed.

---

## Task 4: Keep `kb_query` Precise and Small

**Files:**
- Modify: `packages/mcp/src/tools/query.ts`
- Modify: `packages/mcp/tests/tools/query.test.ts`
- Modify: `documentation/requirements/REQ-mcp-tag-filtering-server-side.md` if semantics change
- Modify: `docs/mcp-reference.md`

- [ ] Keep `kb_query` behavior exact and deterministic; do not turn it into fuzzy search.
- [ ] Preserve existing filters and public semantics.
- [ ] If practical in the same pass, close the current JS-side tag-filter fallback in `packages/mcp/src/tools/query.ts:97` and `packages/cli/src/query/service.ts:70`.
- [ ] Document the split clearly:
  - `kb_search` = discovery
  - `kb_query` = exact retrieval / sourceFile / ID / type / tags

**Deliberate non-goal:** no broad faceted-query expansion in this PR beyond what is needed for clean search/query separation.

---

## Task 5: Make `kb_check` Actionable Without Breaking Structured Consumers

**Files:**
- Modify: `packages/mcp/src/tools/check.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`
- Modify: `packages/mcp/tests/tools/check-aggregated.test.ts`
- Modify: `docs/mcp-reference.md`

- [ ] Add failing tests for richer text output.
- [ ] Change the text response in `packages/mcp/src/tools/check.ts:234` from a bare count to grouped diagnostics:
  - rule name
  - entity ID
  - source file
  - suggestion
- [ ] Keep `structuredContent.violations` and diagnostics stable; only improve the human-readable text layer.
- [ ] Ensure "no violations" stays short and deterministic.

**Suggested commands:**
```bash
bun test packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts
```

---

## Task 6: Fix Diagnostic Logging So `usage.log` Becomes Useful Product Telemetry

**Files:**
- Modify: `packages/mcp/src/diagnostics.ts`
- Modify: `packages/mcp/src/server/tools.ts`
- Modify: `packages/mcp/tests/server.test.ts`

- [ ] Keep client-supplied `telemetry` as-is, but add server-derived fields to every log line so missing telemetry is explicit instead of ambiguous.
- [ ] Add additive fields such as:
  - `telemetry_status` (`provided` / `missing`)
  - `result_summary`
  - per-tool counts where available
- [ ] For `kb_search` and `kb_query`, log:
  - `result_count`
  - `zero_results`
- [ ] For `kb_check`, log:
  - `violation_count`
  - requested rules
- [ ] For `kb_upsert` / `kb_delete`, log returned mutation counts when available.
- [ ] Keep the log schema backward-compatible by adding fields, not renaming existing ones.

**Why this matters:** it closes the current ambiguity seen in `.kb/usage.log` where `telemetry:null` tells you very little.

---

## Task 7: Update Agent-Facing Guidance and Package Docs

**Files:**
- Modify: `packages/opencode/src/prompt.ts`
- Modify: `packages/opencode/README.md`
- Modify: `packages/vscode/README.md`
- Modify: `documentation/requirements/REQ-opencode-agent-mcp-only.md` if wording must reflect five tools
- Modify: `documentation/requirements/REQ-opencode-kibi-plugin-v1.md` if wording must reflect five tools

- [ ] Update prompt guidance to say:
  - use `kb_search` when you need discovery
  - use `kb_query` for exact/source-linked follow-up
- [ ] Replace any brittle "exactly four tools" wording in agent-facing surfaces.
- [ ] Keep MCP-only policy intact; this change adds one MCP tool, not CLI guidance.

**Suggested commands:**
```bash
bun test packages/opencode/tests/prompt.test.ts packages/opencode/tests/hook-contract.test.ts packages/opencode/tests/agent-surface-policy.test.ts
```

---

## Task 8: Release Metadata and Final Verification

**Files:**
- Create: `.changeset/<descriptive-name>.md`

- [ ] Add a changeset covering `kibi-mcp`.
- [ ] Add `kibi-opencode` if prompt/runtime/docs change there.
- [ ] Add `kibi-vscode` if its README or package-facing docs are updated.
- [ ] Run the focused test suite, then a full build.

**Suggested commands:**
```bash
bun test packages/mcp/tests/tools/search.test.ts packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts packages/mcp/tests/server.test.ts
bun test packages/opencode/tests/prompt.test.ts packages/opencode/tests/hook-contract.test.ts packages/opencode/tests/agent-surface-policy.test.ts
bun run build
```

---

## Deferred on purpose

- No pre-apply interception of generated comments; still blocked on host hooks.
- No raw code-content search.
- No CLI `kibi search` in v1; keep this change focused on the agent MCP path first.
- No large `kb_query` parameter explosion in the same PR.

## Recommended commit slices

1. `docs: define kb_search and update public MCP surface`
2. `feat(mcp): add kb_search discovery tool`
3. `feat(mcp): improve kb_check explanations`
4. `chore(mcp): enrich diagnostic usage logging`
5. `docs(opencode): teach search-vs-query guidance`

---

*Plan written: 2026-03-22*
*Scope: Add kb_search discovery tool while keeping kb_query precise, make kb_check more actionable, and improve usage.log diagnostics*
