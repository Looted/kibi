---
"kibi-plugin-sdk": patch
"kibi-plugin-jev": patch
"kibi-cli": patch
"kibi-runtime": patch
---

Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.

- Validate duplicate plugin activation, secrets, and provider ids
- Confine resolved plugin entries to the realpath'd package root
- Evict rejected loadedPackages promises
- Typed classifier attempt outcomes with diagnostics
- Configurable Jev model (default `jev-latest`) on errors and requests
