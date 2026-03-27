# Fix #113 (kb_graph multi-relationship) and #114 (symbol sourceFile upsert)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two open bugs: kb_graph ignoring all but the first relationship type in the filter array, and kb_upsert rejecting sourceFile for symbol entities.

**Architecture:** Issue #113 is a one-line Prolog fix (change `memberchk` to `member` for non-deterministic backtracking). Issue #114 adds `sourceFile` as an optional entity property across the JSON schema, MCP tool input schema, Prolog entity schema, and the upsert serializer. Both fixes need regression tests.

**Tech Stack:** SWI-Prolog, TypeScript, Bun test runner, JSON Schema (AJV)

---

## Task 1: Fix `kb_graph` multi-relationship filtering (Issue #113)

### Task 1a: Write a failing integration test for multi-relationship graph traversal

**Files:**
- Modify: `packages/mcp/tests/tools/graph.test.ts`

The existing test is a mock-based unit test with a single relationship type. We need an integration test that creates entities with multiple relationship types and verifies `kb_graph` returns edges for all requested types.

- [ ] **Step 1: Write the failing integration test**

Add a new `describe` block to `packages/mcp/tests/tools/graph.test.ts` that uses a real Prolog process (following the pattern from `packages/mcp/tests/tools/crud.test.ts`). The test should:

1. Create a requirement, a scenario, and a test entity.
2. Create `specified_by` and `verified_by` relationships.
3. Call `handleKbGraph` with `relationships: ["specified_by", "verified_by"]`.
4. Assert that edges for **both** relationship types are returned.
5. Also assert that reversing the array order produces the same result count.

```typescript
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { PrologProcess as RealPrologProcess } from "kibi-cli/prolog";
import { handleKbGraph } from "../../src/tools/graph.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

// ... keep existing mock-based test unchanged ...

describe("kb_graph multi-relationship integration", () => {
  let prolog: RealPrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-graph-"));
  });

  beforeEach(async () => {
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("returns edges for all requested relationship types (issue #113)", async () => {
    // Create seed entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-GRAPH-113",
      properties: { title: "Graph multi-rel test", status: "open" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-GRAPH-113",
      properties: { title: "Graph scenario", status: "active" },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-GRAPH-113",
      properties: { title: "Graph test", status: "passing" },
    });

    // Create relationships
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-GRAPH-113",
      properties: { title: "Graph multi-rel test", status: "open" },
      relationships: [
        { type: "specified_by", from: "REQ-GRAPH-113", to: "SCEN-GRAPH-113" },
        { type: "verified_by", from: "REQ-GRAPH-113", to: "TEST-GRAPH-113" },
      ],
    });

    // Query with both relationship types
    const result = await handleKbGraph(prolog, {
      seedIds: ["REQ-GRAPH-113"],
      relationships: ["specified_by", "verified_by"],
      direction: "outgoing",
      depth: 1,
    });

    const edges = result.structuredContent?.edges ?? [];
    const edgeTypes = edges.map((e: { type: string }) => e.type);

    // Should have edges of BOTH types
    expect(edgeTypes).toContain("specified_by");
    expect(edgeTypes).toContain("verified_by");
    expect(edges.length).toBe(2);

    // Reversing order should produce same result
    const reversed = await handleKbGraph(prolog, {
      seedIds: ["REQ-GRAPH-113"],
      relationships: ["verified_by", "specified_by"],
      direction: "outgoing",
      depth: 1,
    });
    expect(reversed.structuredContent?.edges?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun test packages/mcp/tests/tools/graph.test.ts`
Expected: The integration test FAILS — only 1 edge returned instead of 2 (the `memberchk` bug).

- [ ] **Step 3: Commit the failing test**

```bash
git add packages/mcp/tests/tools/graph.test.ts
git commit -m "test: add failing integration test for multi-relationship kb_graph (#113)"
```

### Task 1b: Fix the `memberchk` bug in discovery.pl

**Files:**
- Modify: `packages/core/src/discovery.pl:372`

- [ ] **Step 4: Change `memberchk` to `member`**

In `packages/core/src/discovery.pl`, line 372, change:

```prolog
relationship_allowed(Relationships, Type) :-
    memberchk(Type, Relationships).
```

to:

```prolog
relationship_allowed(Relationships, Type) :-
    member(Type, Relationships).
```

`memberchk/2` is deterministic — it finds the first match and commits (implicit cut). When `Type` is unbound, `memberchk(X, [a, b, c])` unifies `X = a` and commits — it never backtracks to try `b` or `c`. By contrast, `member/2` is non-deterministic and generates all members on backtracking, allowing `edge_step` to explore edges for every requested relationship type.

- [ ] **Step 5: Run the test to confirm it passes**

Run: `bun test packages/mcp/tests/tools/graph.test.ts`
Expected: PASS — both relationship types' edges are now returned.

- [ ] **Step 6: Commit the fix**

```bash
git add packages/core/src/discovery.pl
git commit -m "fix(core): use member/2 instead of memberchk/2 for multi-relationship graph traversal (#113)"
```

---

## Task 2: Add `sourceFile` as an optional entity property (Issue #114)

### Task 2a: Write a failing test for symbol upsert with sourceFile

**Files:**
- Modify: `packages/mcp/tests/tools/crud.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test to the existing `describe("MCP CRUD Tool Handlers")` block in `packages/mcp/tests/tools/crud.test.ts`, inside the `describe("kb.query")` block:

```typescript
test("should accept sourceFile when upserting a symbol entity (issue #114)", async () => {
  const result = await handleKbUpsert(prolog, {
    type: "symbol",
    id: "SYM-SF-114",
    properties: {
      title: "Badge Service",
      status: "active",
      sourceFile: "src/app/services/badge.service.ts",
    },
  });

  expect(result.structuredContent?.id).toBe("SYM-SF-114");

  // Verify the sourceFile was persisted and is queryable
  const query = await handleKbQuery(prolog, {
    type: "symbol",
    sourceFile: "badge.service.ts",
  });

  const ids = (query.structuredContent?.entities ?? []).map((e) =>
    String(e.id),
  );
  expect(ids).toContain("SYM-SF-114");
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun test packages/mcp/tests/tools/crud.test.ts`
Expected: FAIL — "Entity validation failed: root: must NOT have additional properties" because `sourceFile` is not in the schema.

- [ ] **Step 3: Commit the failing test**

```bash
git add packages/mcp/tests/tools/crud.test.ts
git commit -m "test: add failing test for symbol sourceFile upsert (#114)"
```

### Task 2b: Add `sourceFile` to entity schemas, serializer, and query layer

**Files:**
- Modify: `packages/cli/src/schemas/entity.schema.json`
- Modify: `packages/core/schema/entities.pl`
- Modify: `packages/core/src/kb.pl` (update `kb_entities_by_source/2` to also search `sourceFile`)
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/tools/upsert.ts`

- [ ] **Step 4: Add `sourceFile` to the JSON entity schema**

In `packages/cli/src/schemas/entity.schema.json`, add `sourceFile` as an optional string property after the `text_ref` entry (line 40):

```json
"text_ref": { "type": "string" },
"sourceFile": { "type": "string" },
```

This allows the property through JSON Schema validation. The `additionalProperties: false` on line 119 will now accept `sourceFile`.

- [ ] **Step 5: Add `sourceFile` to the Prolog entity schema**

In `packages/core/schema/entities.pl`:

After line 30 (`entity_property(_, text_ref, uri).`), add:

```prolog
entity_property(_, sourceFile, uri).
```

After line 64 (`optional_property(Type, text_ref) :- entity_type(Type).`), add:

```prolog
optional_property(Type, sourceFile) :- entity_type(Type).
```

**Note:** While ADR-008 specifies `sourceFile` as a symbol-specific field, using the wildcard `_` matches the pattern used for all other optional properties and is more permissive. This can be tightened to `entity_property(symbol, sourceFile, uri)` later if needed.

- [ ] **Step 6: Add `sourceFile` to the MCP tool input schema**

In `packages/mcp/src/tools-config.ts`, inside the `kb_upsert` tool's `properties` object, after the `text_ref` entry (around line 330), add:

```typescript
sourceFile: {
  type: "string",
  description:
    "Optional source code file path for symbol entities. Example: 'src/services/auth.ts'. Used for source-file traceability.",
},
```

- [ ] **Step 7: Add `sourceFile` to the upsert serializer STRING_FIELDS**

In `packages/mcp/src/tools/upsert.ts`, add `"sourceFile"` to the `STRING_FIELDS` array (around line 265-272):

```typescript
const STRING_FIELDS = [
  "id",
  "title",
  "created_at",
  "updated_at",
  "source",
  "text_ref",
  "sourceFile",
];
```

This ensures `sourceFile` values are serialized as quoted Prolog strings when building the property list for Prolog queries.

- [ ] **Step 8: Update `kb_entities_by_source/2` to also search `sourceFile` property**

In `packages/core/src/kb.pl`, update `kb_entities_by_source/2` (lines 346-355) to search both the `source` and `sourceFile` properties. This is necessary because when a symbol is created via MCP with an explicit `sourceFile`, the `source` property will be `mcp://kibi/upsert` (provenance), and the code file path will be in `sourceFile`. Without this change, `kb_query(sourceFile="badge.service.ts")` would not find the symbol.

Replace the existing predicate:

```prolog
%% kb_entities_by_source(+SourcePath, -Ids)
% Returns all entity IDs whose source property matches SourcePath (substring match).
kb_entities_by_source(SourcePath, Ids) :-
    findall(Id,
        (kb_entity(Id, _Type, Props),
         memberchk(source=RawSource, Props),
         source_value_atom(RawSource, SourceAtom),
         sub_atom(SourceAtom, _, _, _, SourcePath)),
        RawIds),
    sort(RawIds, Ids).
```

With:

```prolog
%% kb_entities_by_source(+SourcePath, -Ids)
% Returns all entity IDs whose source or sourceFile property matches SourcePath (substring match).
kb_entities_by_source(SourcePath, Ids) :-
    findall(Id,
        (kb_entity(Id, _Type, Props),
         source_prop_matches(Props, SourcePath)),
        RawIds),
    sort(RawIds, Ids).

source_prop_matches(Props, SourcePath) :-
    memberchk(source=RawSource, Props),
    source_value_atom(RawSource, SourceAtom),
    sub_atom(SourceAtom, _, _, _, SourcePath).
source_prop_matches(Props, SourcePath) :-
    memberchk(sourceFile=RawSF, Props),
    source_value_atom(RawSF, SFAtom),
    sub_atom(SFAtom, _, _, _, SourcePath).
```

This uses disjunctive clauses so that a match on *either* `source` or `sourceFile` returns the entity.

- [ ] **Step 9: Run the test to confirm it passes**

Run: `bun test packages/mcp/tests/tools/crud.test.ts`
Expected: PASS — the symbol entity with `sourceFile` is accepted and queryable via the `sourceFile` filter.

- [ ] **Step 10: Run the full MCP test suite**

Run: `bun test packages/mcp/tests/`
Expected: All tests pass — no regressions.

- [ ] **Step 11: Commit the fix**

```bash
git add packages/cli/src/schemas/entity.schema.json packages/core/schema/entities.pl packages/core/src/kb.pl packages/mcp/src/tools-config.ts packages/mcp/src/tools/upsert.ts
git commit -m "feat(core): add sourceFile as optional entity property for symbol traceability (#114)"
```

---

## Task 3: Verify, build, and prepare changesets

**Files:**
- Create: `.changeset/<auto-generated>.md` (via `bunx changeset` CLI)

- [ ] **Step 1: Run the full build**

Run: `bun run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 3: Create changesets for affected packages**

Per AGENTS.md Rule 3, create changesets for the modified packages. Two changesets are needed:

**Changeset 1 — `kibi-core` (patch):**

```markdown
---
"kibi-core": patch
---

fix: use member/2 instead of memberchk/2 in relationship_allowed so kb_graph honors all relationship types in the filter array, not just the first (#113)
```

**Changeset 2 — `kibi-core` (minor) + `kibi-mcp` (minor) + `kibi-cli` (minor):**

```markdown
---
"kibi-core": minor
"kibi-mcp": minor
"kibi-cli": minor
---

feat: add sourceFile as an optional entity property, allowing MCP clients to record the source code file path when upserting symbol entities (#114)
```

Run: `bunx changeset` (or create the files manually in `.changeset/`)

- [ ] **Step 4: Commit changesets**

```bash
git add .changeset/
git commit -m "chore: add changesets for #113 and #114"
```

---

## Design Notes

### Issue #113 — Why `memberchk` vs `member` matters

In SWI-Prolog, `memberchk(X, List)` succeeds at most once (it has an implicit cut after the first match). When `X` is unbound, `memberchk(X, [a, b, c])` unifies `X = a` and commits — it never backtracks to try `b` or `c`. By contrast, `member(X, [a, b, c])` generates `X = a`, then on backtracking `X = b`, then `X = c`.

Since `edge_step` uses `findall/3` (via `bfs_layers`) to collect all matching edges, it needs `relationship_allowed` to be non-deterministic so that Prolog backtracks through all allowed relationship types.

### Issue #114 — Why `sourceFile` is an entity property, not just a query filter

ADR-008 designates `sourceFile` as an **authored field** for symbols. The `symbols.yaml` manifest uses it as a first-class field. The current architecture stores the manifest path (not the code file path) as the entity's `source` property, creating a gap when symbols are created via MCP rather than via manifest sync.

Adding `sourceFile` as a persisted entity property:
- Aligns with ADR-008's design intent
- Eliminates the workaround of overloading `source` with the code file path
- Keeps `source` as provenance (where the entity definition came from)
- Makes source-file-based queries work naturally

### Follow-up: Restrict `sourceFile` to symbol entities only (optional)

If desired, a future change could restrict `sourceFile` to symbol entities only by:
- Changing `entity_property(_, sourceFile, uri)` to `entity_property(symbol, sourceFile, uri)` in `entities.pl`
- Adding a conditional block in `entity.schema.json` similar to the fact-only field restriction
This is not necessary for the fix but would enforce the ADR-008 intent more strictly.
