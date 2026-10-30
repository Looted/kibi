---
title: Qualified language analysis preserves deterministic scope and stable identities
status: open
text_ref: docs/architecture/multilingual-language-catalog.md
semantic_text: Source classification must retain C/C++ header ambiguity until a consistent explicit language signal is present. Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages. Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source. Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added. HCL declaration records must preserve structural scope without implying executable-symbol proof. Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause. Prolog analysis must return each plunit test unit and each test in it as a distinct symbol.
semantic_clauses:
  - Source classification must retain C/C++ header ambiguity until a consistent explicit language signal is present
  - Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages
  - Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source
  - Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
  - HCL declaration records must preserve structural scope without implying executable-symbol proof
  - Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause
  - Prolog analysis must return each plunit test unit and each test in it as a distinct symbol
logic_claims:
  - CLAIM-087077F7ED9BB626
  - CLAIM-74CCA0B4217E88FE
  - CLAIM-C8E3056966B4FF2A
  - CLAIM-1B48A4FB9D21C6C4
  - CLAIM-68ABFA8E7140BC5A
  - CLAIM-CA1F42A97DACEBAD
  - CLAIM-9F27A5506C6CFF7E
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a0b94198349e78587c00a1c6a6c3a1b920a559314e8254e944d149afc48aac02
semantic_inventory:
  - claim_key: CLAIM-087077F7ED9BB626
    claim_text: Source classification must retain C/C++ header ambiguity until a consistent explicit language signal is present
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
    semantic_key: SEM-CE506211981C5D577396C442
  - claim_key: CLAIM-74CCA0B4217E88FE
    claim_text: Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages
    role: normative
    status: modeled
    span:
      start: 113
      end: 311
    semantic_key: SEM-7B433EEE08BDF06317B724DF
  - claim_key: CLAIM-C8E3056966B4FF2A
    claim_text: Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source
    role: normative
    status: modeled
    span:
      start: 313
      end: 460
    semantic_key: SEM-4EB9C696F4187E3B7943722C
  - claim_key: CLAIM-1B48A4FB9D21C6C4
    claim_text: Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
    role: normative
    status: modeled
    span:
      start: 462
      end: 566
    semantic_key: SEM-7FB5C54C48AF33B3A02F9314
  - claim_key: CLAIM-68ABFA8E7140BC5A
    claim_text: HCL declaration records must preserve structural scope without implying executable-symbol proof
    role: normative
    status: modeled
    span:
      start: 568
      end: 663
    semantic_key: SEM-E686EA195E9626D240D99B30
  - claim_key: CLAIM-CA1F42A97DACEBAD
    claim_text: Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause
    role: normative
    status: modeled
    span:
      start: 665
      end: 806
    semantic_key: SEM-69A71045B43F9C9ABA7CEECF
  - claim_key: CLAIM-9F27A5506C6CFF7E
    claim_text: Prolog analysis must return each plunit test unit and each test in it as a distinct symbol
    role: normative
    status: modeled
    span:
      start: 808
      end: 898
    semantic_key: SEM-79D7C40F19DD1B54E15A760A
tags:
  - multilingual
  - language-catalog
  - source-classification
  - review:context-missing
id: REQ-multilingual-language-catalog
type: req
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to add SWI-Prolog source analysis, including telling Perl and Prolog .pl files apart by content: "Can we now handle https://github.com/Looted/kibi/issues/614?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T14:48:20.893Z'
---
Source classification must retain C/C++ header ambiguity until a consistent explicit language signal is present. Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages. Source classification must derive extensionless Python, Bash, Ruby and JavaScript language hints from bounded shebang text without executing source. Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added. HCL declaration records must preserve structural scope without implying executable-symbol proof. Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause. Prolog analysis must return each plunit test unit and each test in it as a distinct symbol.
