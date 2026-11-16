---
title: Engine core module loading
status: active
fact_kind: subject
subject_key: kibi.engine.core_modules
canonical_key: kibi.engine.core_modules
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - engine
text_ref: packages/cli/src/prolog/codec.ts
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:22.126Z'
id: FACT-engine-core-modules-subject
type: fact
---
How a Kibi client asks the engine to load a Prolog core module such as checks.pl or discovery.pl before calling it: which copy of the module file is loaded, given that the engine daemon may run the core of another install of the same release.