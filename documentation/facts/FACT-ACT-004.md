---
id: FACT-ACT-004
title: Instructor Editor Pre-Save Description Fix
status: active
tags: [active-context, bug-fix, annotations]
source: memory-bank/activeContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: observation
---

Fixed "Error loading annotation" error when adding a note description before first save. Root cause was `VideoPlayer.refreshActiveAnnotation()` attempting `loadFromJSON` when `fabricData` was null/empty.
