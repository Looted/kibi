---
title: build manifest records the installer URL and SHA-256 in a prebuilt block = true
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: manifest_records_prebuilt_provenance
operator: eq
value_type: bool
value_bool: true
text_ref: packages/swipl-win32-x64/build-manifest.template.json
claim_key: CLAIM-C71EB6D36CDB2014
claim_text: the build manifest must record that URL and SHA-256 in a prebuilt block
origin:
  kind: agent
  recorded_at: '2026-11-20T11:16:03.618Z'
id: FACT-prolog-win32-prebuilt-manifest-prebuilt-block
type: fact
---
The packed build-manifest.json carries a prebuilt block with the installer URL and SHA-256 instead of source pins, and validateBuildManifest accepts it for win32-x64.