---
id: SCEN-branch-store-recovery
title: Diagnose and recover an unreadable exact branch store
status: active
priority: must
tags:
  - branching
  - recovery
links:
  - REQ-branch-store-recovery-v2
  - type: verified_by
    target: TEST-cli-branch-store-recovery
---

1. An agent calls status while the active exact branch store is missing or has
   an invalid journal pointer.
2. Kibi reports the exact branch attachment and structured store diagnostic
   without starting the engine or creating storage.
3. The operator previews recovery, then explicitly applies it.
4. Kibi preserves the original branch-store bytes, rebuilds from authored
   sources, and finishes with a fresh exact attachment.
