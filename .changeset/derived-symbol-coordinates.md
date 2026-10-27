---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Symbol coordinates no longer cause merge conflicts. `.kb/symbol-coordinates.yaml` is now a local cache that every `kibi sync` derives from source; it is gitignored and never committed. Before, each coordinate record carried a hash of its whole source file, so any two branches that edited the same source file conflicted on it, even when they touched different declarations.

What changes for you:

- `kibi init` adds `.kb/symbol-coordinates.yaml` to `.gitignore`. Every `kibi sync` refreshes the cache incrementally, re-extracting only symbols whose source or identity changed, and never rewrites `.kb/symbols.yaml`.
- The staged check judges symbol evidence by the declaration titles in the staged `.kb/symbols.yaml`. When those titles cover every declaration of a staged source file, that is impact evidence for it, so a body-only edit to a modeled symbol now commits with only the `symbol_semantic_review_needed` warning instead of needing a coordinate refresh staged with it. A renamed or added declaration that `.kb/symbols.yaml` does not list still fails, and the message names the uncovered and stale titles.
- `kibi check-generated --staged` checks only the `.kb/symbols.yaml` layout and rejects a commit that stages the coordinate cache.
- Schema 13: `kibi migrate` adds the gitignore entry and removes a committed `.kb/symbol-coordinates.yaml` from the Git index while keeping the local file. Commit the result once; until then `check-generated` blocks commits in repositories that still track the file.
- The reviewed refresh gate for Python decorator coordinates is retired, since there is no committed coordinate refresh left to review.
