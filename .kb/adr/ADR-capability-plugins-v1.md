---
title: Bounded capability plugins (kibi.plugin.v1)
status: accepted
tags:
  - architecture
  - plugins
  - extensibility
id: ADR-capability-plugins-v1
type: adr
---
# ADR: Capability plugins v1

## Context
Kibi needs bounded extension points for semantic classification, ontology packs, and symbol extraction without giving plugins mutation, Prolog, or proof authority. Prior ADRs (including ADR-008) assumed CLI-owned TypeScript AST extraction; that assumption no longer holds once replaceable extractors exist.

## Decision
Ship `kibi.plugin.v1` with three packages (`kibi-plugin-sdk`, `kibi-plugin-builtin`, `kibi-plugin-jev`), explicit `package.json#kibi.plugins` activation, project-local package resolution (npm/pnpm/Yarn PnP; no `NODE_PATH`/globals), lazy loading, and per-runtime/workspace registry caching (no process-global mutable singleton).

## Package structure
- `kibi-plugin-sdk`: contracts, validation, stamps, capability IDs
- `kibi-plugin-builtin`: deterministic classifiers, rich ontology schemas/rules, TS/JS symbol extractor
- `kibi-plugin-jev`: optional metered semantic classifier behind `@typesafe-ai/sdk` (not in default CLI/MCP dependency graph)

## Capability boundaries
Architecture: host extracts canonical input → capability registry → composed typed result → host validates → existing Kibi semantics consume. Plugins never delete propositions, downgrade completeness, manufacture typed grounding, construct trusted mutations, create LogicRuleIR, or declare proof.

## Activation model
Only bare declared dependency package names listed under `kibi.plugins` load. Named export must be `kibiPlugin`. `permissions` are disclosure metadata, not sandbox enforcement. Provider version provenance comes from the resolved package `package.json.version` (export must match).

## Builtin semantics
With no plugins configured, only `kibi-plugin-builtin` runs. Maintenance paths (`sync`, `check`, `upsert`, `validate-upsert`, `migration`, `status`, `proof`, etc.) invoke builtin classification synchronously and never reach external classifiers.

## replace / augment / shadow
- **replace**: at most one per capability. Ontology replace excludes the builtin provider catalog; valid empty `match()`/`decisions[]` is abstention (no builtin fill). Exception/invalid output falls back to builtin with visible diagnostics.
- **augment**: additive; semantic augment touches only unresolved/ambiguous claims.
- **shadow**: never canonical; must still execute when configured; expose bounded comparison/provenance metadata only.

## Trust boundary
SDK validates claim keys, coverage, confidence/ambiguity ranges, finite enums, symbol kinds/coordinates/path consistency, ontology schema ownership/arity/polarity. Host owns completeness, mutation, Prolog, and proof permanently.

## External / network disclosure
External semantic classifiers are allowlisted only for `kb_semantic_advisor` and `kb_compile_intent`. Never call a metered provider merely to add provenance warnings. Installed-but-inactive Jev must make zero client calls.

## What remains permanently core
Inventory/completeness, mutation apply plans, Prolog coherence/contradiction, proof contracts/receipts, and source-first persistence.

## Consequences / versioning
Supersedes ADR-008 statements that coordinates are always produced by a CLI-owned TypeScript AST extractor and that `ts-morph` is a required MCP dependency. Future capability versions must be additive IDs; v1 contracts stay stable.
