---
title: Code comments are never a traceability source
status: accepted
firmness: firm
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11: "comments should be fallbacks, and the symbols cooridnates should take their role ... should we just hard drop/migrate them?"; wording approved 2026-11-11 ("Ok")'
  recorded_at: '2026-11-11T05:45:16.871Z'
tags:
  - traceability
  - symbols
  - manifest
  - implements-comments
id: ADR-traceability-manifest-only
type: adr
---
## Context

`ADR-annotation-strategy-v2` kept the symbol manifest authoritative but accepted inline `// implements REQ-<area>-<behavior>` comments as hints. In practice they were more than hints: `kibi check --staged` read the leading comments of each changed symbol and counted them toward the traceability gate, and a leading comment replaced the symbol's manifest links for that gate without any check that the named requirement exists or is current. The OpenCode risk classifier treated a file that contained such a comment as traced, and `AGENTS.md`, the Cursor guidance and the CLI reference recommended them for quick changes.

The comments drifted. In Kibi's own repository 4,366 symbols carried them; only 605 matched their manifest links, 678 were linked by the manifest to other requirements (ownership narrowed on purpose), 3,083 had no manifest entry, and 1,741 comment links named closed requirements.

## Decision

- Code comments are never a traceability source. Only `.kb/symbols.yaml` links a symbol to a requirement (`implements`, `covered_by`, `executable_for`), and generated coordinates keep the link on the right declaration.
- `kibi check --staged`, the source extractors and every host plugin stop reading or recommending `implements` comments. `SourceSymbolAnalysis.directiveText` in the plugin SDK is deprecated and ignored.
- `kibi migrate` lists the comments left in tracked source files as one review action (`review_inline_implements_comment`) so a person moves each link that still holds into the manifest. Kibi never edits source code to remove them.
- Kibi's own sources carry no `implements` comments.

## Consequences

- A commit that touches a symbol whose only link was a comment fails the staged gate until the manifest links it. This is a hard change, announced with migration steps.
- There is one record to keep current, so a superseded requirement can no longer survive in a comment that nothing checks.

## Why this changed

The maintainer decided that comments should only ever have been fallbacks with symbol coordinates taking their role, and asked to hard drop and migrate them instead of keeping them as hints that the staged gate still counted.
