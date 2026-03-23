# Typed Fact Schema and Sync Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land proposal Task 3 by adding typed fact fields to the existing `fact` entity, preserving them through Markdown extraction and sync persistence, and round-tripping numeric/boolean fact values without breaking legacy prose facts or existing query parsing semantics.

**Architecture:** Keep `fact` as the existing entity type and add proposal-aligned optional typed fields to the CLI/public schema, mirrored Prolog schema, and extractor/persistence paths. Validate stricter field combinations only when `fact_kind` is present, keep legacy fact markdown with no `fact_kind` valid during migration, and teach the RDF/codec layer to round-trip `value_int`, `value_number`, `value_bool`, and `closed_world` as real scalar values instead of flattened strings.

**Tech Stack:** TypeScript, Bun, gray-matter, JSON Schema, SWI-Prolog, RDF persistence.

**Scope note:** This Task 3-focused plan intentionally folds in the minimum red coverage from proposal Task 2 needed to prove typed fact acceptance at the CLI and MCP boundaries, because the repo does not yet have `packages/mcp/tests/tools/upsert-contradictions.test.ts`.

---

## File map

- Modify: `packages/cli/src/public/schemas/entity.ts` — runtime/public entity schema object.
- Modify: `packages/cli/src/schemas/entity.schema.json` — AJV-facing JSON schema mirror.
- Modify: `packages/cli/src/types/entities.ts` — TypeScript entity model; keep typed fact fields fact-specific.
- Modify: `packages/cli/src/extractors/markdown.ts` — preserve typed fact frontmatter and normalize YAML dates.
- Modify: `packages/cli/src/commands/sync/persistence.ts` — serialize typed fact fields during `kibi sync` instead of dropping them.
- Modify: `packages/core/schema/entities.pl` — declare new fact properties and scalar kinds for core validation.
- Modify: `packages/cli/schema/entities.pl` — mirror the core entity-property declarations.
- Modify: `packages/core/schema/validation.pl` — add `integer` / `number` / `boolean` kinds and strict fact-shape validation.
- Modify: `packages/cli/schema/validation.pl` — mirror the core validation behavior.
- Modify: `packages/core/src/kb.pl` — store and read typed RDF literals for integer/number/boolean fact values.
- Modify: `packages/cli/src/prolog/codec.ts` — parse typed literals back into JS scalar values without changing plain atom parsing for IDs, tags, or list members.
- Modify: `packages/cli/src/prolog/codec.js` — checked-in JS mirror consumed directly by some tests; keep it in lockstep with `codec.ts`.
- Modify: `packages/cli/tests/schemas.test.ts` — proposal-aligned public schema tests.
- Modify: `packages/cli/tests/extractors/markdown.test.ts` — extractor preservation tests.
- Modify: `packages/cli/tests/commands/sync.test.ts` — end-to-end sync/query round-trip tests.
- Modify: `packages/mcp/tests/tools/query.test.ts` — codec/query parsing tests for typed literals.
- Modify: `packages/mcp/tests/tools/crud.test.ts` — Prolog-backed MCP upsert/query round-trip tests.
- Create: `packages/mcp/tests/tools/upsert-contradictions.test.ts` — initial typed-fact upsert smoke tests in the proposal’s future contradiction-test file.
- Modify: `packages/core/tests/schema.plt` — Prolog validation tests for strict fact shapes.
- Create: `.changeset/typed-fact-schema-sync.md` — required release metadata before any code commit touching `kibi-core` / `kibi-cli`, and before changing MCP accepted payloads via imported CLI schemas.

## Traceability note

- Any new or modified TypeScript/JavaScript function or class in this slice must keep or add `// implements REQ-004` for schema/entity-shape helpers, `// implements REQ-007` for Markdown extraction and sync helpers, and `// implements REQ-003` for query/codec helpers.
- If any `packages/mcp/src/*` symbol changes while implementing this plan, annotate it with `// implements REQ-002, REQ-011`.

### Deliberate non-goals for this slice

- Do **not** migrate `documentation/facts/*.md` yet; that is Task 8 once the pipeline is proven.
- Do **not** implement semantic contradiction logic in `packages/core/src/kb.pl`; that is Task 4 from the proposal.
- Do **not** implement contradiction-specific write rejection yet; only add the initial typed-fact smoke tests to `packages/mcp/tests/tools/upsert-contradictions.test.ts` so Task 5 can extend the same file.

---

### Task 1: Add the release stub and make the public schema go red, then green

**Files:**
- Create: `.changeset/typed-fact-schema-sync.md`
- Modify: `packages/cli/src/public/schemas/entity.ts`
- Modify: `packages/cli/src/schemas/entity.schema.json`
- Modify: `packages/cli/src/types/entities.ts`
- Modify: `packages/cli/tests/schemas.test.ts`

- [ ] **Step 1: Create the changeset stub before the first code commit**

```md
---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Add typed fact fields to the fact schema and preserve them through CLI/MCP sync and query round-trips.
```

- [ ] **Step 2: Replace the outdated speculative schema tests with proposal-aligned red tests**

Use only fields from `docs/proposals/2026-03-22-kb-contradiction-model-plan.md`:

```ts
const subjectFact = {
  id: "FACT-USER-SESSION",
  title: "User session subject",
  status: "active",
  created_at: "2026-03-23T00:00:00Z",
  updated_at: "2026-03-23T00:00:00Z",
  source: "documentation/facts/FACT-USER-SESSION.md",
  type: "fact",
  fact_kind: "subject",
  subject_key: "user.session",
};

const propertyFact = {
  id: "FACT-SESSION-TIMEOUT-30",
  title: "Session timeout is 30 minutes",
  status: "active",
  created_at: "2026-03-23T00:00:00Z",
  updated_at: "2026-03-23T00:00:00Z",
  source: "documentation/facts/FACT-SESSION-TIMEOUT-30.md",
  type: "fact",
  fact_kind: "property_value",
  subject_key: "user.session",
  property_key: "timeout_minutes",
  operator: "eq",
  value_type: "int",
  value_int: 30,
  unit: "minutes",
  scope: "global",
  polarity: "require",
  closed_world: true,
  canonical_key: "user.session.timeout_minutes.eq.30",
};
```

Add explicit assertions that:
- legacy facts with no `fact_kind` still validate,
- `fact_kind`, `operator`, and `value_type` reject invalid enum values,
- non-`fact` entities with any fact-only field fail validation,
- absent optional sibling fields are omitted rather than set to `null`.

- [ ] **Step 3: Run the schema tests to verify they fail first**

Run: `bun test packages/cli/tests/schemas.test.ts`

Expected: FAIL because `entity.schema.json` still rejects `fact_kind`, `subject_key`, `value_int`, `closed_world`, and friends.

- [ ] **Step 4: Add the new public schema fields and enums**

Keep the base entity contract intact and add fact-only optional properties. Because `additionalProperties: false` is already enabled, define the fact-only properties at the root and then forbid them when `type !== "fact"` via an `allOf` conditional or equivalent `oneOf` split. Use these proposal-aligned enums:

```ts
fact_kind: ["subject", "property_value", "observation", "meta"]
operator: ["eq", "neq", "lt", "lte", "gt", "gte"]
value_type: ["string", "int", "number", "bool"]
polarity: ["require", "forbid"]
```

Treat these as plain strings in the JSON schema:

```ts
subject_key, property_key, value_string, unit, scope, valid_from, valid_to, canonical_key
```

Treat these as true scalars:

```ts
value_int: integer
value_number: number
value_bool: boolean
closed_world: boolean
```

Also add a conditional that rejects any of those fact-only fields on non-`fact` entities, e.g. by forbidding `required: [field]` for each field in the non-`fact` branch.

Also update `packages/cli/src/types/entities.ts` so only `Fact` carries the new fields:

```ts
export interface FactFields {
  fact_kind?: "subject" | "property_value" | "observation" | "meta";
  subject_key?: string;
  property_key?: string;
  operator?: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  value_type?: "string" | "int" | "number" | "bool";
  value_string?: string;
  value_int?: number;
  value_number?: number;
  value_bool?: boolean;
  unit?: string;
  scope?: string;
  polarity?: "require" | "forbid";
  closed_world?: boolean;
  valid_from?: string;
  valid_to?: string;
  canonical_key?: string;
}

export type Fact = BaseEntity & FactFields & { type: "fact" };
```

- [ ] **Step 5: Re-run the schema tests to verify they pass**

Run: `bun test packages/cli/tests/schemas.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the green schema slice**

```bash
git add .changeset/typed-fact-schema-sync.md packages/cli/src/public/schemas/entity.ts packages/cli/src/schemas/entity.schema.json packages/cli/src/types/entities.ts packages/cli/tests/schemas.test.ts
git commit -m "feat(cli): add typed fact entity schema"
```

---

### Task 2: Preserve typed fact fields in Markdown extraction

**Files:**
- Modify: `packages/cli/src/extractors/markdown.ts`
- Modify: `packages/cli/tests/extractors/markdown.test.ts`

- [ ] **Step 1: Add extractor tests that fail on dropped fact fields**

Add one temp-file test for a strict property fact and one for YAML datetime normalization. Cover both base timestamps and typed-fact timestamps:

```md
---
id: FACT-SESSION-TIMEOUT-30
title: Session timeout is 30 minutes
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: 30
scope: global
polarity: require
closed_world: true
valid_from: 2026-03-23T00:00:00Z
valid_to: 2026-12-31T23:59:59Z
canonical_key: user.session.timeout_minutes.eq.30
---
```

Assert that `extractFromMarkdown()` returns:
- `value_int` as the number `30`,
- `closed_world` as `true`,
- `created_at` / `updated_at` as ISO strings when YAML parses them as `Date`,
- `valid_from` / `valid_to` as ISO strings,
- no injected `null` fields for absent value siblings.

- [ ] **Step 2: Run the extractor tests to verify they fail first**

Run: `bun test packages/cli/tests/extractors/markdown.test.ts`

Expected: FAIL because `ExtractedEntity` and `extractFromMarkdown()` currently drop every typed fact field.

- [ ] **Step 3: Implement fact-field preservation and date normalization**

In `packages/cli/src/extractors/markdown.ts`, add explicit field lists and a date normalizer instead of ad hoc property copying:

```ts
const FACT_STRING_FIELDS = [
  "fact_kind",
  "subject_key",
  "property_key",
  "operator",
  "value_type",
  "value_string",
  "unit",
  "scope",
  "polarity",
  "valid_from",
  "valid_to",
  "canonical_key",
] as const;

const FACT_NUMBER_FIELDS = ["value_int", "value_number"] as const;
const FACT_BOOLEAN_FIELDS = ["value_bool", "closed_world"] as const;

function normalizeDateLike(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}
```

Then use that helper for `created_at`, `updated_at`, `valid_from`, and `valid_to`, extend `ExtractedEntity`, and only attach typed fact fields when `type === "fact"`.

- [ ] **Step 4: Re-run the extractor tests to verify they pass**

Run: `bun test packages/cli/tests/extractors/markdown.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the extractor slice**

```bash
git add packages/cli/src/extractors/markdown.ts packages/cli/tests/extractors/markdown.test.ts
git commit -m "feat(cli): preserve typed fact frontmatter fields"
```

---

### Task 3: Mirror the Prolog schema and validate strict fact shapes

**Files:**
- Modify: `packages/core/schema/entities.pl`
- Modify: `packages/cli/schema/entities.pl`
- Modify: `packages/core/schema/validation.pl`
- Modify: `packages/cli/schema/validation.pl`
- Modify: `packages/core/tests/schema.plt`

- [ ] **Step 1: Add focused PLUnit tests for legacy and strict fact shapes**

Add tests for these cases:
- legacy prose fact with no `fact_kind` remains valid,
- `subject` fact with `subject_key` is valid,
- `property_value` fact with `value_type="int"` and `value_int=30` is valid,
- `property_value` fact missing the matching value field is invalid,
- `property_value` fact with `value_type="string"` plus `value_int=30` is invalid,
- `closed_world="true"` (string) is invalid while `closed_world=true` (boolean atom) is valid,
- `req` entities with `fact_kind` or `value_int` are invalid,
- invalid enum values for `fact_kind`, `operator`, `value_type`, and `polarity` are invalid.

- [ ] **Step 2: Run the Prolog schema tests to verify they fail first**

Run: `swipl -q -s packages/core/tests/schema.plt -g run_tests,halt`

Expected: FAIL because the mirrored Prolog schemas do not yet know about the new properties or scalar kinds.

- [ ] **Step 3: Add the fact properties and validation helpers in both mirrors**

Add the new property declarations to both `entities.pl` files:

```prolog
entity_property(fact, fact_kind, string).
entity_property(fact, subject_key, string).
entity_property(fact, property_key, string).
entity_property(fact, operator, string).
entity_property(fact, value_type, string).
entity_property(fact, value_string, string).
entity_property(fact, value_int, integer).
entity_property(fact, value_number, number).
entity_property(fact, value_bool, boolean).
entity_property(fact, unit, string).
entity_property(fact, scope, string).
entity_property(fact, polarity, string).
entity_property(fact, closed_world, boolean).
entity_property(fact, valid_from, datetime).
entity_property(fact, valid_to, datetime).
entity_property(fact, canonical_key, string).
```

Then extend both `validation.pl` files:

```prolog
validate_property_type(Type, Prop, Value) :-
    entity_property(Type, Prop, Kind),
    check_kind(Kind, Value), !.

check_kind(integer, V) :- integer(V).
check_kind(number, V) :- number(V).
check_kind(boolean, true).
check_kind(boolean, false).
```

Do **not** keep the current `entity_property(_Any, Prop, Kind)` fallback or the implicit default-to-atom behavior; unknown props on the wrong entity type must fail validation.

Add a strict fact-shape pass after per-property type validation:

```prolog
validate_entity(Type, Props) :-
    entity_type(Type),
    forall(required_property(Type, P), memberchk(P=_Val, Props)),
    forall(member(Key=Val, Props), validate_property_type(Type, Key, Val)),
    validate_entity_shape(Type, Props).

validate_entity_shape(fact, Props) :-
    !,
    ( memberchk(fact_kind=RawKind, Props) -> validate_fact_shape(RawKind, Props) ; true ).
validate_entity_shape(Type, _) :-
    Type \= fact.
```

Implement `validate_fact_shape/2` so:
- `subject` requires `subject_key`,
- `property_value` requires `subject_key`, `property_key`, `operator`, `value_type`, and exactly one matching `value_*` field,
- `observation` and `meta` are allowed but do not require the full strict property tuple yet,
- `fact_kind`, `operator`, `value_type`, and `polarity` are checked against explicit allow-lists,
- facts with no `fact_kind` stay valid.

- [ ] **Step 4: Re-run the Prolog schema tests to verify they pass**

Run: `swipl -q -s packages/core/tests/schema.plt -g run_tests,halt`

Expected: PASS.

- [ ] **Step 5: Commit the Prolog schema slice**

```bash
git add packages/core/schema/entities.pl packages/cli/schema/entities.pl packages/core/schema/validation.pl packages/cli/schema/validation.pl packages/core/tests/schema.plt
git commit -m "feat(core): validate typed fact fields and strict fact shapes"
```

---

### Task 4: Persist typed fact fields and round-trip scalar values through sync/query

**Files:**
- Modify: `packages/cli/src/commands/sync/persistence.ts`
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/cli/src/prolog/codec.ts`
- Modify: `packages/cli/src/prolog/codec.js`
- Modify: `packages/cli/tests/commands/sync.test.ts`
- Modify: `packages/mcp/tests/tools/query.test.ts`
- Modify: `packages/mcp/tests/tools/crud.test.ts`
- Create: `packages/mcp/tests/tools/upsert-contradictions.test.ts`

- [ ] **Step 1: Add failing end-to-end round-trip tests**

In `packages/cli/tests/commands/sync.test.ts`, add two temp fact markdown fixtures, run `kibi sync`, then query them back as JSON using the existing `kibiBin` harness (`execSync(\`bun ${kibiBin} query ...\`)`) rather than a shell-global `kibi` command:

```md
---
id: FACT-SESSION-TIMEOUT-30
title: Session timeout is 30 minutes
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: 30
unit: minutes
scope: global
polarity: require
closed_world: true
valid_from: 2026-03-23T00:00:00Z
canonical_key: user.session.timeout_minutes.eq.30
---
```

Assert after `bun kibi query fact --id FACT-SESSION-TIMEOUT-30 --format json` that:
- `value_int === 30` (number, not string),
- `closed_world === true` (boolean, not string),
- `fact_kind === "property_value"`,
- `valid_from === "2026-03-23T00:00:00Z"`.

Add a second fixture like:

```md
---
id: FACT-RATE-LIMIT-1-5
title: Rate limit is 1.5 requests per second
type: fact
status: active
created_at: 2026-03-23T00:00:00Z
updated_at: 2026-03-23T00:00:00Z
fact_kind: property_value
subject_key: api.client
property_key: rate_limit_rps
operator: eq
value_type: number
value_number: 1.5
unit: requests_per_second
scope: global
polarity: require
canonical_key: api.client.rate_limit_rps.eq.1.5
---
```

Assert it round-trips as `value_number === 1.5` (number, not string).

In `packages/mcp/tests/tools/crud.test.ts`, add a Prolog-backed MCP round-trip test that:
- calls `handleKbUpsert()` with a typed `fact` payload,
- queries the entity back via `handleKbQuery()`,
- asserts `value_int` and `closed_world` come back as JS number/boolean,
- and also inspects a raw `prolog.query(...)` result to lock the emitted XSD datatypes (`#integer`, `#decimal`, and `#boolean`).

Add a companion MCP round-trip case for `value_number: 1.5` and assert the query result is a JS number plus raw RDF `xsd:decimal`.

Create `packages/mcp/tests/tools/upsert-contradictions.test.ts` now with the first two smoke tests only:
- typed `fact` upsert succeeds,
- non-`fact` upsert carrying `fact_kind` fails schema validation.

Leave contradiction-specific assertions for the later Task 5 slice.

In `packages/mcp/tests/tools/query.test.ts`, add codec red tests for typed literals only. Do **not** change plain atom parsing globally, because `parsePrologValue()` is also used for IDs, tag values, and list members.

Add tests like:

```ts
expect(parsePrologValue('^^("30", "http://www.w3.org/2001/XMLSchema#integer")')).toBe(30);
expect(parsePrologValue('^^("1.5", "http://www.w3.org/2001/XMLSchema#decimal")')).toBe(1.5);
expect(parsePrologValue('^^("true", "http://www.w3.org/2001/XMLSchema#boolean")')).toBe(true);
expect(parsePrologValue("tag-a")).toBe("tag-a");
expect(parsePrologValue("FACT-123")).toBe("FACT-123");
```

and keep the existing list/quoted-string parsing assertions intact as regressions.

- [ ] **Step 2: Run the round-trip tests to verify they fail first**

Because `packages/cli/bin/kibi` and `packages/mcp/src/tools/upsert.ts` consume built `kibi-cli` artifacts, rebuild CLI before these tests.

Run: `bun run build:cli && bun test packages/cli/tests/commands/sync.test.ts packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/crud.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts`

Expected: FAIL because sync currently drops the fields, the Prolog validator still ignores entity type, and the codec currently turns returned scalars into strings.

- [ ] **Step 3: Serialize the new fields during `kibi sync`**

Refactor `persistEntities()` to use a field-aware serializer instead of the current fixed whitelist:

```ts
const ATOM_FIELDS = new Set(["status", "owner", "priority", "severity"]);
const STRING_FIELDS = new Set([
  "id",
  "title",
  "created_at",
  "updated_at",
  "source",
  "text_ref",
  "fact_kind",
  "subject_key",
  "property_key",
  "operator",
  "value_type",
  "value_string",
  "unit",
  "scope",
  "polarity",
  "valid_from",
  "valid_to",
  "canonical_key",
]);
const NUMBER_FIELDS = new Set(["value_int", "value_number"]);
const BOOLEAN_FIELDS = new Set(["value_bool", "closed_world"]);
```

Only serialize keys that are actually present; never emit `null` placeholders.

- [ ] **Step 4: Teach the RDF layer and codec to preserve scalar types**

Refactor `packages/core/src/kb.pl` so property serialization is key-aware (`value_to_literal/3`) instead of value-only, which avoids ambiguity between `value_int` and `value_number`. Preserve booleans and numbers as typed RDF literals:

```prolog
value_to_literal(value_int, Value, Value^^'http://www.w3.org/2001/XMLSchema#integer') :- integer(Value), !.
value_to_literal(value_number, Value, Value^^'http://www.w3.org/2001/XMLSchema#decimal') :- number(Value), !.
value_to_literal(value_bool, true, true^^'http://www.w3.org/2001/XMLSchema#boolean') :- !.
value_to_literal(value_bool, false, false^^'http://www.w3.org/2001/XMLSchema#boolean') :- !.
value_to_literal(closed_world, true, true^^'http://www.w3.org/2001/XMLSchema#boolean') :- !.
value_to_literal(closed_world, false, false^^'http://www.w3.org/2001/XMLSchema#boolean') :- !.
```

Then update both `packages/cli/src/prolog/codec.ts` and `packages/cli/src/prolog/codec.js` so `parsePrologValue()` recognizes typed literals inside the existing `^^(...)` branch. Do **not** add global plain-token coercion for unquoted values.

Inside the typed-literal branch, parse the datatype suffix instead of returning every typed literal as a string:

```ts
if (datatype.endsWith("#integer")) return Number.parseInt(String(literalValue), 10);
if (datatype.endsWith("#decimal") || datatype.endsWith("#double")) {
  return Number.parseFloat(String(literalValue));
}
if (datatype.endsWith("#boolean")) return String(literalValue) === "true";
```

Do this without changing the behavior for quoted strings, IDs, tags, or list parsing. The Prolog-backed MCP test above should be the source of truth for the exact emitted `^^(...)` form.

- [ ] **Step 5: Re-run the round-trip tests to verify they pass**

Run: `bun run build:cli && bun test packages/cli/tests/commands/sync.test.ts packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/crud.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add packages/cli/src/commands/sync/persistence.ts packages/core/src/kb.pl packages/cli/src/prolog/codec.ts packages/cli/src/prolog/codec.js packages/cli/tests/commands/sync.test.ts packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/crud.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts
git commit -m "feat(cli): persist typed fact fields through sync"
```

---

### Task 5: Final verification and branch-safe handoff

**Files:**
- Verify all touched files

- [ ] **Step 1: Keep `kibi-mcp` in the changeset even if only tests changed there**

The accepted MCP payload shape changes in this slice because `handleKbUpsert()` validates against `kibi-cli/schemas/entity`, so the MCP package behavior changes as soon as the new CLI schema is built and consumed.

- [ ] **Step 2: Run the full focused verification suite**

Run: `bun run build:cli && bun test packages/cli/tests/schemas.test.ts packages/cli/tests/extractors/markdown.test.ts packages/cli/tests/commands/sync.test.ts packages/mcp/tests/tools/query.test.ts packages/mcp/tests/tools/crud.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts`

Expected: PASS.

- [ ] **Step 3: Run the Prolog suite again**

Run: `swipl -q -s packages/core/tests/schema.plt -g run_tests,halt`

Expected: PASS.

- [ ] **Step 4: Run the package build**

Run: `bun run build`

Expected: PASS.

- [ ] **Step 5: Review the diff before handing off to Task 4 of the proposal**

Run: `git status --short`

Expected: clean working tree after the final Task 3 commit.

---

## Recommended commit slices

1. `feat(cli): add typed fact entity schema`
2. `feat(cli): preserve typed fact frontmatter fields`
3. `feat(core): validate typed fact fields and strict fact shapes`
4. `feat(cli): persist typed fact fields through sync`

## Hand-off notes for the next slice

- Start proposal Task 4 immediately after this plan lands; `packages/core/src/kb.pl:676` should switch from `PropA \= PropB` to semantic comparison over `subject_key`, `property_key`, `operator`, `value_type`, value field, `scope`, and `polarity`.
- Do not migrate `documentation/facts/FACT-*.md` until the Task 4/5 contradiction path is using the new fields end-to-end.
- Keep `observation` and `meta` accepted here, but do not make them contradiction-participating until the semantic predicates are in place.
