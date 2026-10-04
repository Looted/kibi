---
title: README and landing page point at the published documentation
status: open
tags:
  - docs
  - readme
  - site
priority: should
semantic_text: The repository README must link a documentation source that the documentation site publishes to that page's published URL, not to the GitHub rendering of the source. The published documentation site must include an llms.txt index whose page links are exactly the documentation catalog. The documentation landing page must link to that index so a language model can continue from the main page into the deeper documentation.
logic_claims:
  - CLAIM-7EAF872340247E1C
  - CLAIM-C9971C412F2898ED
  - CLAIM-250C03BFD6B74BC6
semantic_clauses:
  - The repository README must link a documentation source that the documentation site publishes to that page's published URL, not to the GitHub rendering of the source.
  - The published documentation site must include an llms.txt index whose page links are exactly the documentation catalog.
  - The documentation landing page must link to that index so a language model can continue from the main page into the deeper documentation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 75013844e088a7667df1203a79dbca3f0801083597b173cf360cd42f782b4ff0
semantic_inventory:
  - claim_key: CLAIM-7EAF872340247E1C
    claim_text: The repository README must link a documentation source that the documentation site publishes to that page's published URL, not to the GitHub rendering of the source
    payload_hash: 181225d2afea636321ea30ffb391725f76e6b6c8d7e70efda48607823ce2dcde
    reason: Grounded by the strict property fact for the README link target.
    role: normative
    span:
      end: 164
      start: 0
    status: modeled
  - claim_key: CLAIM-C9971C412F2898ED
    claim_text: The published documentation site must include an llms.txt index whose page links are exactly the documentation catalog
    payload_hash: 181225d2afea636321ea30ffb391725f76e6b6c8d7e70efda48607823ce2dcde
    reason: Grounded by the strict property fact for the language-model index.
    role: normative
    span:
      end: 284
      start: 166
    status: modeled
  - claim_key: CLAIM-250C03BFD6B74BC6
    claim_text: The documentation landing page must link to that index so a language model can continue from the main page into the deeper documentation
    payload_hash: 181225d2afea636321ea30ffb391725f76e6b6c8d7e70efda48607823ce2dcde
    reason: Grounded by the strict property fact for the landing-page index link.
    role: normative
    span:
      end: 422
      start: 286
    status: modeled
id: REQ-docs-readme-published-links
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The repository README must link a documentation source that the documentation site publishes to that page's published URL, not to the GitHub rendering of the source. The published documentation site must include an llms.txt index whose page links are exactly the documentation catalog. The documentation landing page must link to that index so a language model can continue from the main page into the deeper documentation.
