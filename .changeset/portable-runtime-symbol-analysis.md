---
"kibi-runtime": patch
---

Kibi's runtime package keeps TypeScript symbol analysis portable when installed from a build made elsewhere. It resolves the builtin analyzer through its declared package dependency, so TypeScript resources come from the consumer's install.

- Externalize `kibi-plugin-builtin` from the runtime bundle and declare it as a runtime dependency.
