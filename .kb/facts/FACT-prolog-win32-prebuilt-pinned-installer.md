---
title: win32-x64 installer pinned by URL and SHA-256 = true
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: installer_pinned_by_url_and_sha256
operator: eq
value_type: bool
value_bool: true
text_ref: scripts/swipl-windows-repack.py
claim_text: The win32-x64 bundled SWI-Prolog payload must come from the official upstream NSIS installer pinned by URL and SHA-256 under prebuilt.win32-x64 in scripts/swipl-version.json
origin:
  kind: agent
  recorded_at: '2026-11-20T11:03:01.458Z'
claim_key: CLAIM-2B98F53BA22D037C
id: FACT-prolog-win32-prebuilt-pinned-installer
type: fact
---
prebuilt.win32-x64 in scripts/swipl-version.json pins the upstream NSIS installer by URL and SHA-256; the repack refuses any other bytes.