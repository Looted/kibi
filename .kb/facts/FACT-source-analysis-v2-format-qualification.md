---
title: Qualified parser closure after behavior-preserving metadata formatting
status: active
fact_kind: observation
tags:
  - source-analysis-v2
  - qualification
  - license-audit
text_ref: 'Reviewed the eleven-file Biome repair against exact baseline postimages. Parser catalog and SPDX SBOM parsed values are unchanged; grammar, queries, runtime and license texts retain their qualified bytes. The canonical asset verifier regenerated integrity.json, then the host qualification generator regenerated the approved execution closure. Twelve current immutable candidate archives match all 1590 packaged source files without mismatches. Full build, Biome and workspace typecheck pass; this records technical artifact qualification, not fresh executable requirement proof. SBOM SHA-256: 3368f09089da06973891f4125b29c79bdb1e72f3ee6d34c32774b91ca310d70f; catalog SHA-256: 6474612ac72f236d65c72a0fde808d993443271df7686525bfc1272098b3d8a6; integrity SHA-256: 8bd6d3d7033a513c4687ee8ce53f9ac560b8460e85da0f85dea35a109f289297.'
id: FACT-source-analysis-v2-format-qualification
type: fact
---
