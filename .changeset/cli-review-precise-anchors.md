---
"kibi-cli": patch
---

`kibi check` reviews ask only for evidence a requirement can actually have. `coarse_anchor_only_review` no longer counts a whole-file anchor on a file that no source extractor covers, such as JSON, YAML, workflow files and scripts without an extension, because there is no smaller unit to link. `coverage_depth_review` now skips requirements marked `proof_exempt` with a reason, the same way the evidence floor does.
