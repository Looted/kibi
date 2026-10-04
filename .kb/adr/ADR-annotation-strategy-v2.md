---
title: The symbols.yaml manifest is authoritative; inline implements comments are hints
status: accepted
priority: must
tags:
  - vscode
  - annotation
  - symbols
  - manifest
  - traceability
origin:
  kind: agent
  recorded_at: '2026-10-04T03:16:07.018Z'
id: ADR-annotation-strategy-v2
type: adr
---
# The symbol manifest is authoritative; inline `implements` comments are hints

## Context

`ADR-annotation-strategy` chose the `.kb/symbols.yaml` manifest as the only code-to-entity mapping and ruled out inline annotations, so that the VS Code code-action provider could index symbols by title and source path without parsing source files.

Practice has since diverged. The repository carries inline `// implements REQ-<area>-<behavior>` comments above most traced symbols, `AGENTS.md` accepts them for quick changes, and three consumers read them:

- `kibi check --staged` extracts changed symbols with the tree-sitter analysis worker (`packages/plugin-treesitter/src/analysis-worker.ts`), reads the leading `implements` directive comments of each changed symbol (`parseReqDirectives` in `packages/cli/src/traceability/symbol-extract.ts`) and overlays them as `changed_symbol_req` links in the temporary staged KB, where they count toward the changed-symbol traceability gate (`changed_symbol_missing_req/3` in `packages/core/src/kb.pl`) without a check that the named requirement exists or is current.
- The OpenCode risk classifier (`packages/opencode/src/risk-classifier.ts`) treats code that carries an `implements REQ-` annotation as already traced.
- Reviewers and agents read them as the nearest statement of which requirement a symbol serves.

The KB itself never compiles these comments: `kb_query`, `kb_coverage`, `kb_check` on the full KB and requirement proof read only the manifest.

## Decision

- `.kb/symbols.yaml` is the authoritative source of symbol links (`implements`, `covered_by`, `executable_for`). It is written only through Kibi operations (`kb_upsert` and `kb_delete`, or their project-local CLI routes), never by hand.
- Generated coordinates live only in `.kb/symbol-coordinates.yaml`, refreshed with `kibi sync --refresh-symbol-coordinates` and verified with `kibi check-generated`.
- Inline `// implements REQ-<area>-<behavior>` (or `# implements ...`) comments directly above a symbol are accepted as hints. They are read by staged checks for changed symbols and by host tooling, and they never create or replace a KB relationship.
- An inline annotation names an existing current requirement. When a requirement is superseded, its manifest links and the annotations that name it move to the superseding requirement together.
- Test and end-to-end code is traced through manifest entries with `executable_for` rather than inline annotations.

## Consequences

- The manifest and the comments can disagree. The manifest wins for every KB answer, coverage report and proof; a comment only affects the staged check of the symbols it precedes.
- Neither `kb_check` nor the staged gate reports an annotation that names a closed, superseded or unknown requirement, so annotation drift is found by review or by scanning for `implements` comments whenever requirements are superseded.
- `ADR-annotation-strategy` is superseded: its manifest-first decision stands, its ban on inline annotations does not.
