---
"kibi-cli": patch
---

`coarse_anchor_only_review` no longer counts a whole-file anchor on a source file that declares nothing behavioral, such as a flat `eslint.config.js` that only exports a config array. Such a file has no function or type to link instead, just like JSON or workflow YAML.

The review now reads the workspace file and keeps an anchor only when the source extractor finds at least one behavioral declaration in it, the same set `symbol-granularity` lists as available granular symbols. A file that cannot be read keeps the extension-based answer.
