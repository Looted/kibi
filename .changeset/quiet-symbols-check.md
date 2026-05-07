---
"kibi-cli": patch
---

Kibi now makes symbol manifest tracking harder to forget. New projects initialized with `kibi init` get a default `documentation/symbols.yaml`, and the managed pre-commit hook blocks commits when that manifest has unstaged changes so refreshed coordinates are committed with the related work.

- Create the default symbol manifest during `kibi init` when it is missing.
- Add a pre-commit guard that requires dirty `documentation/symbols.yaml` changes to be staged before `kibi check --staged` runs.
