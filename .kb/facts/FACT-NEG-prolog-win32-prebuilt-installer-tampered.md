---
title: win32-x64 installer matches the pinned SHA-256 = false
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: installer_pinned_by_url_and_sha256
operator: eq
value_type: bool
value_bool: false
text_ref: scripts/swipl-version.json
claim_text: The win32-x64 installer bytes match the pinned SHA-256
origin:
  kind: agent
  recorded_at: '2026-11-20T11:53:34.347Z'
claim_key: CLAIM-31065234D5FA0D52
id: FACT-NEG-prolog-win32-prebuilt-installer-tampered
type: fact
---
Opposing assumption for SCEN-NEG-prolog-win32-prebuilt-tampered-installer: the downloaded installer does not match the pinned hash, which REQ-prolog-win32-prebuilt-provenance forbids.