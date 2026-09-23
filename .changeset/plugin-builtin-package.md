---
"kibi-plugin-builtin": minor
---

Kibi ships a default capability plugin package so TypeScript symbol extraction, ontology matching, and semantic lane classification live behind the public plugin protocol instead of private CLI paths.

- Add `kibi-plugin-builtin@0.1.0` with `kibiPlugin` exporting all three capabilities
- Built-in ts-morph extractor, ontology pack (launcher→core→policy→product→product-tail), and sync semantic classifier
- CLI depends on this package and thin-wraps the extractor / ontology pack for default parity
