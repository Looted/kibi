---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
---

Entities created by `kb_compile_intent` plans now survive `kibi sync --rebuild`. Before this, `kb_apply_plan` committed plan entities only to the branch store, so rebuilding the store from the workspace silently dropped them and their relationships. Applying a plan now writes each entity to its authored document, exactly as `kb_upsert` does, and code files named in `sourceLocations` are no longer overwritten with a requirement document.

- `kb_compile_intent` sets `document.path` on every non-symbol step of a `ready` plan (the canonical path `kb_upsert` would choose) and returns `sourceWrites: []`. The requirement's document is the first `sourceLocations` entry only when it is a `.md`/`.mdx` file outside `.kb/`; code locations are evidence only. A step that fails entity validation or path resolution makes the plan `needs_resolution` with `A plan step cannot be applied as written: …`.
- `kb_apply_plan` renders each step's document with the newly exported `renderSourceDocument` at apply time, journals it with the new file origin `entity-document`, publishes documents before relationship shards, and commits each entity with that document as its `source`. `changedPaths` lists every document written. Plan source writes that target the same path keep their exact bytes.
