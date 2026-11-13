---
title: Bundled SWI-Prolog release packaging
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
text_ref: scripts/populate-swipl-platform-packages.mjs
fact_kind: subject
subject_key: kibi.prolog.bundled_release
canonical_key: kibi.prolog.bundled_release
id: FACT-prolog-bundled-release-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How a Kibi release packages the bundled SWI-Prolog runtimes: only archives whose bytes match their checksum sidecar, free of symlinks, go into the platform packages, and a dry run cannot publish anything.
