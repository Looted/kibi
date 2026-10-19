---
title: Symbol Source File
status: active
tags:
  - security
  - symbols
  - lane:strict
fact_kind: subject
subject_key: symbol.source_file
canonical_key: symbol.source_file
claim_key: CLAIM-7A590145B64A85FE
claim_text: Symbol sourceFile values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, .. escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle.
id: FACT-SUBJECT-SYMBOL-SOURCE-FILE
type: fact
---
