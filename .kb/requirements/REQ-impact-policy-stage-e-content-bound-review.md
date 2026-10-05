---
title: Content-bound impact review and trusted aggregate pull request validation
status: open
tags:
  - multilingual
  - impact-policy
  - content-bound-review
  - stage-e
text_ref: documentation/impact-review-stage-e.md
semantic_text: Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy. Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement. Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges. Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line. Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy. Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers. Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes. Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence. Kibi must refresh known Python decorator declaration coordinates only with exact declaration matching and valid content-bound review of the complete inventory. Kibi must retain partial analysis status after reviewed Python decorator coordinate migration. Kibi must refuse local-HEAD coordinate review during CI without a protected target-base snapshot. Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation. Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate. Kibi must reject candidate policy weakening against the trusted target policy. Kibi must run aggregate validation without executing candidate workspace code. Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts. Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics. Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided. Kibi must preserve existing project behavior until impact policy is explicitly enabled.
logic_claims:
  - CLAIM-43E7502CC01143B9
  - CLAIM-95B622628DF93B07
  - CLAIM-871721A2555885B9
  - CLAIM-3DC4E54394289A04
  - CLAIM-8705A8806E2038ED
  - CLAIM-7F35CFCC9C4CD183
  - CLAIM-BFC6D501B2221523
  - CLAIM-3A4340EBE891D8D0
  - CLAIM-28B4A38C4CA97495
  - CLAIM-E38867920C0D6A4E
  - CLAIM-C6EA1D7E2DEC8F52
  - CLAIM-097BCE1268B9EAEC
  - CLAIM-2B3C543C216F686F
  - CLAIM-D7F08F67F0CB82AF
  - CLAIM-377FABBF19D3105A
  - CLAIM-330896475CDE15F7
  - CLAIM-067190C4260E103B
  - CLAIM-1FAF2CA08169368C
  - CLAIM-584C3309E83833D8
semantic_clauses:
  - Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy
  - Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement
  - Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges
  - Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line
  - Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy
  - Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers
  - Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes
  - Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence
  - Kibi must refresh known Python decorator declaration coordinates only with exact declaration matching and valid content-bound review of the complete inventory
  - Kibi must retain partial analysis status after reviewed Python decorator coordinate migration
  - Kibi must refuse local-HEAD coordinate review during CI without a protected target-base snapshot
  - Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation
  - Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate
  - Kibi must reject candidate policy weakening against the trusted target policy
  - Kibi must run aggregate validation without executing candidate workspace code
  - Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts
  - Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics
  - Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided
  - Kibi must preserve existing project behavior until impact policy is explicitly enabled
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6a61522126c645c3bf549992e6980cd0ce392843faaf9fb241facbfe93055d4c
semantic_inventory:
  - claim_key: CLAIM-43E7502CC01143B9
    claim_text: Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy
    role: normative
    span:
      start: 0
      end: 208
    status: modeled
    semantic_key: SEM-2EE32666A6F5E9276DFAC5A5
  - claim_key: CLAIM-95B622628DF93B07
    claim_text: Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement
    role: normative
    span:
      start: 210
      end: 332
    status: modeled
    semantic_key: SEM-1C6AE04CA8143700EE09E3B1
  - claim_key: CLAIM-871721A2555885B9
    claim_text: Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges
    role: normative
    span:
      start: 334
      end: 444
    status: modeled
    semantic_key: SEM-9275A59A406E806FA53CDC24
  - claim_key: CLAIM-3DC4E54394289A04
    claim_text: Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line
    role: normative
    status: modeled
    semantic_key: SEM-CEB50A8109E6C4A18C3D9240
    span:
      start: 446
      end: 572
  - claim_key: CLAIM-8705A8806E2038ED
    claim_text: Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy
    role: normative
    span:
      start: 574
      end: 683
    status: modeled
    semantic_key: SEM-5280F817E595817637C7E9C8
  - claim_key: CLAIM-7F35CFCC9C4CD183
    claim_text: Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers
    role: normative
    status: modeled
    semantic_key: SEM-0005C7C4A66CCABE016CDF0C
    span:
      start: 685
      end: 783
  - claim_key: CLAIM-BFC6D501B2221523
    claim_text: Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes
    role: normative
    span:
      start: 785
      end: 895
    status: modeled
    semantic_key: SEM-B05CDFBA710247CC176DCE15
  - claim_key: CLAIM-3A4340EBE891D8D0
    claim_text: Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence
    role: normative
    span:
      start: 897
      end: 991
    status: modeled
    semantic_key: SEM-B50CA3707BADCF683AF63D38
  - claim_key: CLAIM-28B4A38C4CA97495
    claim_text: Kibi must refresh known Python decorator declaration coordinates only with exact declaration matching and valid content-bound review of the complete inventory
    role: normative
    span:
      start: 993
      end: 1151
    status: modeled
    semantic_key: SEM-7F48A78FB60B53DCE65A71A0
  - claim_key: CLAIM-E38867920C0D6A4E
    claim_text: Kibi must retain partial analysis status after reviewed Python decorator coordinate migration
    role: normative
    span:
      start: 1153
      end: 1246
    status: modeled
    semantic_key: SEM-9794B6111D3264DC3883EC84
  - claim_key: CLAIM-C6EA1D7E2DEC8F52
    claim_text: Kibi must refuse local-HEAD coordinate review during CI without a protected target-base snapshot
    role: normative
    span:
      start: 1248
      end: 1344
    status: modeled
    semantic_key: SEM-1CBB4C888F011B3167DF4B0D
  - claim_key: CLAIM-097BCE1268B9EAEC
    claim_text: Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation
    role: normative
    span:
      start: 1346
      end: 1456
    status: modeled
    semantic_key: SEM-FF30C29010A6B69CB5C31F80
  - claim_key: CLAIM-2B3C543C216F686F
    claim_text: Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate
    role: normative
    span:
      start: 1458
      end: 1557
    status: modeled
    semantic_key: SEM-CEDDA9F92ABE17CA5F5A792B
  - claim_key: CLAIM-D7F08F67F0CB82AF
    claim_text: Kibi must reject candidate policy weakening against the trusted target policy
    role: normative
    span:
      start: 1559
      end: 1636
    status: modeled
    semantic_key: SEM-891B629CDFBFF6FC6EF08018
  - claim_key: CLAIM-377FABBF19D3105A
    claim_text: Kibi must run aggregate validation without executing candidate workspace code
    role: normative
    span:
      start: 1638
      end: 1715
    status: modeled
    semantic_key: SEM-245551822006BB1F48222865
  - claim_key: CLAIM-330896475CDE15F7
    claim_text: Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts
    role: normative
    span:
      start: 1717
      end: 1835
    status: modeled
    semantic_key: SEM-800343D5BA6EBAA19726A584
  - claim_key: CLAIM-067190C4260E103B
    claim_text: Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics
    role: normative
    span:
      start: 1837
      end: 1988
    status: modeled
    semantic_key: SEM-43A79AC78501FF1FF88DD06F
  - claim_key: CLAIM-1FAF2CA08169368C
    claim_text: Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided
    role: exception
    span:
      start: 1990
      end: 2105
    status: modeled
    semantic_key: SEM-8C8B8AC0416346409245F0F0
  - claim_key: CLAIM-584C3309E83833D8
    claim_text: Kibi must preserve existing project behavior until impact policy is explicitly enabled
    role: normative
    span:
      start: 2107
      end: 2193
    status: modeled
    semantic_key: SEM-643868EE86BD05B30FA153C8
id: REQ-impact-policy-stage-e-content-bound-review
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy. Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement. Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges. Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line. Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy. Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers. Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes. Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence. Kibi must refresh known Python decorator declaration coordinates only with exact declaration matching and valid content-bound review of the complete inventory. Kibi must retain partial analysis status after reviewed Python decorator coordinate migration. Kibi must refuse local-HEAD coordinate review during CI without a protected target-base snapshot. Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation. Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate. Kibi must reject candidate policy weakening against the trusted target policy. Kibi must run aggregate validation without executing candidate workspace code. Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts. Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics. Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided. Kibi must preserve existing project behavior until impact policy is explicitly enabled.
