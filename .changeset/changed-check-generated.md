---
"kibi-cli": patch
"kibi-mcp": patch
---

`kibi check --changed` and `kb_check` with `changed: true` now run the generated-manifest check the pre-commit hook runs before the staged check, so `commitAllowed` is false when a commit would be refused for a `.kb/symbols.yaml` out of its canonical layout, a staged `symbol-coordinates.yaml`, or a symbol source that is not a regular file. The problem is listed in `messages`, and the summary no longer says "0 findings block the commit" for a refusal no finding explains.
