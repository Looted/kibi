---
"kibi-cli": patch
---

`coverage_depth_review` no longer fires on retired requirements. A requirement that is `deprecated`, carries a non-requirement status such as `superseded`, is the target of a `supersedes` link, or is `closed` without an `implemented` tag no longer adds an advisory coverage-depth finding to `kb_check` / `kibi check` output, so the quality lane lists only requirements whose coverage still matters.

Technical summary: `createCoverageDepthQualityDiagnostics` now reviews requirements whose status is `open`, `in_progress` or legacy `active` / `approved`, plus `closed` requirements tagged `implemented` (the documented "done, with evidence" shape), and skips any requirement another requirement supersedes.
