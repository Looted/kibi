---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Exhaustive proofs can now cover a catalog: `domain_source` takes a `field` key, and when the export is a list of records Kibi reads that field of each record as the domain member (an operation catalog's `name`, for example), in TypeScript, JavaScript and Python. A record without the field fails the read, and `field` is accepted only for `kind: exhaustive`.

Regex and string proofs can now read one field of an object: a dotted `pattern_source.export` such as `BRAND.name` walks the export's fields (object keys, dict keys or class attributes) and names the missing field when one is absent. A proof file that imports `BRAND` counts as importing `BRAND.name`, for exhaustive domains as well.
