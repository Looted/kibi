# KB Contradiction Model Remediation Delta & v1 Contract

> **For agentic workers:** This document is the canonical remediation contract. It freezes v1 semantics and defines the delta between current implementation and the intended state.

## 1. Remediation Delta Matrix

| Feature Area | Already Implemented | Partial | Missing |
|--------------|---------------------|---------|---------|
| **Schema: Typed Facts** | `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, `value_*`, `unit`, `scope`, `polarity`, `closed_world`, `canonical_key` fields present in JSON schema and Prolog. | Markdown sync for `canonical_key`, `closed_world`, `valid_from/to` round-tripping verification. | Documentation of exhaustive field list in `entity-schema.md`. |
| **Predicates: Contradictions** | `contradicting_reqs/3` exists with scalar support (`eq`, `neq`, `lt`, `lte`, `gt`, `gte`). | Polarity (`require`/`forbid`) and Scope overlap detection. | Explicitly mapping `closed` requirements as current for contradiction checks. |
| **Write-time Enforcement** | `kb_upsert` intercepts contradictions using `check_req_contradiction/1` in `rdf_transaction`. | Detailed error message formatting with specific remediation hints. | Strict validation that new normative reqs link to at least one `property_value` fact. |
| **Validation Rules** | `strict-fact-shape` rule exists in `checks.pl`. | `strict-req-fact-pairing` and `invalid-supersession` rules. | Enabling `strict-fact-shape` by default (currently `false` in config). |
| **OpenCode Guidance** | `AGENTS.md` mentions `fact_kind` and two-lane model. | Explicit "audit-first" guidance for legacy prose facts. | Prompts for `retroactive-init.md` and `llm-rules.md` updates. |
| **Documentation** | `entity-schema.md` contains basic two-lane description. | Concrete examples for `bizzwords` and `align` migration. | Freeze v1 semantics explicitly in all doc locations. |

## 2. Frozen v1 Semantics

The following product decisions are frozen for v1 and must not be expanded or modified:

1.  **Entity Types**: Keep exactly 8 entity types (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`). No new "note" or "issue" entities.
2.  **Contradiction Scope**: Checks apply **only** to strict facts (`fact_kind: subject` or `property_value`). `observation` and `meta` facts are evidence only and do NOT trigger write rejections.
3.  **Authoring Lanes**: Legacy/mixed requirement authoring (linked to prose facts) is **audit-first**. They do not block writes but appear in `kb_check`.
4.  **Closed Requirements**: Requirements with `status: closed` remain **current** for contradiction checks to prevent regression against fulfilled requirements.
5.  **Reserved Fields**: `closed_world` and `canonical_key` are reserved for round-tripping and future use. They do **not** carry functional contradiction semantics in v1.
6.  **External Repos**: `align` and `bizzwords` content are treated as evidence/examples. Remediation does NOT require breaking their default behavior or forced migrations in this pass.

## 3. Transition & Evolution Rules

- **Append-Only Evolution**: The preferred path for changing normative requirements is creating a new requirement + `supersedes` link.
- **Escape Hatch**: Conflicting writes are rejected unless the same `kb_upsert` call includes `supersedes` edges targeting the conflicting current requirement(s).
- **Audit-First Migration**: Legacy facts (no `fact_kind`) remain readable and linkable but are flagged in `kb_check` migration rules when linked to new requirements.

---

## Task 1: Lock the Product Contract, Transition Rules, and v1 Scope (REMEDIATION)

- [x] Convert existing proposal into this canonical remediation document.
- [ ] Update `docs/entity-schema.md` to reflect the exhaustive fact field list and frozen lanes.
- [ ] Update `AGENTS.md` to clarify the "audit-first" stance on legacy prose facts.
- [ ] Add `strict-req-fact-pairing` and `invalid-supersession` integrity rules to `checks.pl`.
- [ ] Enable `strict-fact-shape` by default in config once migration path is confirmed.
- [ ] Add polarity (`require`/`forbid`) and scope overlap detection to `contradicting_reqs/3`.
- [ ] Update `retroactive-init.md` and `llm-rules.md` with explicit "audit-first" prompts for legacy prose facts.
