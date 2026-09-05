---
title: The OpenCode plugin must detect the current workspace posture to adjust enforcem
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_posture_detection
property_key: clause_01_the_opencode_plugin_must_detect_the_current_work
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_posture_detection.clause_01_the_opencode_plugin_must_detect_the_current_work.eq.true
claim_key: CLAIM-9C0D0DBABFF8256E
claim_text: 'The OpenCode plugin must detect the current workspace posture to adjust enforcement:\n\n`root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.\n`root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.\n`root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.\n`vendored_only`: Kibi is only present in vendored dependencies.\n`hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.\nSupport a `maintenanceDegraded` overlay when runtime execution is unavailable'
id: FACT-PROP-REQ-OPENCODE-POSTURE-DETECTION-C01
type: fact
---
