---
"kibi-plugin-builtin": patch
"kibi-cli": patch
---

External classifiers stay limited to the two allowlisted operations, ontology matches keep their claim keys through host composition, and CLI predicate rule tables now re-export the builtin pack so advisor and modeling cannot drift. Lane selection from the builtin classifier also accepts host snake_case signal shapes, which unblocks typecheck/build for capability-plugin call sites.

- fix(builtin): chooseLane accepts kind-only LaneSignal (unblocks analysis-receipt typecheck)
- feat(cli): stamp claimKey on composed ontology match candidates
- refactor(cli): re-export predicate rule tables from kibi-plugin-builtin
- chore(builtin): export rule sets + package.json subpath
