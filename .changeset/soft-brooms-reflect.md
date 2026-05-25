---
"kibi-cli": patch
---

Kibi CLI now exposes a reusable bundled skill API for loading Markdown skill bundles safely. Consumers can list bundled skills, load a validated manifest plus body, read declared resources, and validate skill directories before using them.

- Add `kibi-cli/skills` public export.
- Add skill manifest/bundle types, structured errors, secure path/resource validation, and size limits.
- Add unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits, declared-resource-only reads, and empty bundled directories.
