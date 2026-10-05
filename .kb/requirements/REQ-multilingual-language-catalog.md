---
title: Qualified language analysis preserves deterministic scope and stable identities
status: open
text_ref: docs/architecture/multilingual-language-catalog.md
semantic_text: Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present. Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source. Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added. HCL declaration records must preserve structural scope without implying executable-symbol proof.
semantic_clauses:
  - Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present
  - Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source
  - Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
  - HCL declaration records must preserve structural scope without implying executable-symbol proof
logic_claims:
  - CLAIM-869DA7FAE6FEEEF3
  - CLAIM-C8E3056966B4FF2A
  - CLAIM-1B48A4FB9D21C6C4
  - CLAIM-68ABFA8E7140BC5A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 30349e46e45d3b5befaee092d004c21ba83170a319db81c656d8ddaa9d2ffddf
semantic_inventory:
  - claim_key: CLAIM-869DA7FAE6FEEEF3
    claim_text: Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
    semantic_key: SEM-0826BB1D5FA00F56BB751C1C
  - claim_key: CLAIM-C8E3056966B4FF2A
    claim_text: Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source
    role: normative
    status: modeled
    span:
      start: 129
      end: 276
    semantic_key: SEM-4EB9C696F4187E3B7943722C
  - claim_key: CLAIM-1B48A4FB9D21C6C4
    claim_text: Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
    role: normative
    status: modeled
    span:
      start: 278
      end: 382
    semantic_key: SEM-7FB5C54C48AF33B3A02F9314
  - claim_key: CLAIM-68ABFA8E7140BC5A
    claim_text: HCL declaration records must preserve structural scope without implying executable-symbol proof
    role: normative
    status: modeled
    span:
      start: 384
      end: 479
    semantic_key: SEM-E686EA195E9626D240D99B30
tags:
  - multilingual
  - language-catalog
  - source-classification
id: REQ-multilingual-language-catalog
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present. Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source. Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added. HCL declaration records must preserve structural scope without implying executable-symbol proof.
