---
title: Capability plugin configuration
status: open
tags:
  - plugins
semantic_text: package.json kibi.plugins must be the canonical v1 capability plugin activation and mode surface. Plugin secrets must be supplied from the process environment outside repository plugin configuration. The TYPESAFE_API_KEY provider setting must come from the process environment source when a real TypeSafe client is required. The Jev model must default to jev-latest. A blank KIBI_JEV_MODEL provider setting from the environment source must remain unset. KIBI_JEV_MODEL must optionally select the Jev model as a provider setting from the process environment source. The Jev timeout must be at least 1 millisecond. The Jev timeout must be at most 120000 milliseconds. A malformed KIBI_JEV_TIMEOUT_MS value is an invalid timeout input and must fail closed before any network call. Explicit programmatic Jev options must override environment defaults. Effective provider model identity must be exposed in plugin provenance. kibi doctor must report configured plugin package, capability, mode, and declared dependency status as a provider diagnostic without importing the plugin package. kibi doctor must fail the provider diagnostic when a configured plugin package is not a declared dependency. A generic executable kibi.config.ts file must be absent from v1. A generic arbitrary plugin-options bag must be absent from v1.
semantic_clauses:
  - package.json kibi.plugins must be the canonical v1 capability plugin activation and mode surface.
  - Plugin secrets must be supplied from the process environment outside repository plugin configuration.
  - The TYPESAFE_API_KEY provider setting must come from the process environment source when a real TypeSafe client is required.
  - The Jev model must default to jev-latest.
  - A blank KIBI_JEV_MODEL provider setting from the environment source must remain unset.
  - KIBI_JEV_MODEL must optionally select the Jev model as a provider setting from the process environment source.
  - The Jev timeout must be at least 1 millisecond.
  - The Jev timeout must be at most 120000 milliseconds.
  - A malformed KIBI_JEV_TIMEOUT_MS value is an invalid timeout input and must fail closed before any network call.
  - Explicit programmatic Jev options must override environment defaults.
  - Effective provider model identity must be exposed in plugin provenance.
  - kibi doctor must report configured plugin package, capability, mode, and declared dependency status as a provider diagnostic without importing the plugin package.
  - kibi doctor must fail the provider diagnostic when a configured plugin package is not a declared dependency.
  - A generic executable kibi.config.ts file must be absent from v1.
  - A generic arbitrary plugin-options bag must be absent from v1.
logic_claims:
  - CLAIM-F8D3453720E38457
  - CLAIM-8755CB612B895673
  - CLAIM-B0BADA99D4277113
  - CLAIM-8A4067501CAD35CE
  - CLAIM-41D4D60BBBDBE779
  - CLAIM-559981D67DA156AE
  - CLAIM-3BD271D9D12829CA
  - CLAIM-FC1B942EF88AF6D7
  - CLAIM-E5A884DFD4D8137F
  - CLAIM-DE8F089404951DE7
  - CLAIM-C2DD641ADEBB94B4
  - CLAIM-A29D577A4E285B4A
  - CLAIM-9E850C720B4CF5F9
  - CLAIM-5EB9113DC061789C
  - CLAIM-6D5C825727F4F609
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f1147027c749d10e6240da5fcbc3822b385017bc2162b0eea138afd0c8528312
semantic_inventory:
  - claim_key: CLAIM-F8D3453720E38457
    claim_text: package.json kibi.plugins must be the canonical v1 capability plugin activation and mode surface
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8755CB612B895673
    claim_text: Plugin secrets must be supplied from the process environment outside repository plugin configuration
    role: normative
    status: modeled
    span:
      start: 98
      end: 198
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-B0BADA99D4277113
    claim_text: The TYPESAFE_API_KEY provider setting must come from the process environment source when a real TypeSafe client is required
    role: normative
    status: modeled
    span:
      start: 200
      end: 323
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8A4067501CAD35CE
    claim_text: The Jev model must default to jev-latest
    role: normative
    status: modeled
    span:
      start: 325
      end: 365
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-41D4D60BBBDBE779
    claim_text: A blank KIBI_JEV_MODEL provider setting from the environment source must remain unset
    role: normative
    status: modeled
    span:
      start: 367
      end: 452
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-559981D67DA156AE
    claim_text: KIBI_JEV_MODEL must optionally select the Jev model as a provider setting from the process environment source
    role: normative
    status: modeled
    span:
      start: 454
      end: 563
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-3BD271D9D12829CA
    claim_text: The Jev timeout must be at least 1 millisecond
    role: normative
    status: modeled
    span:
      start: 565
      end: 611
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-FC1B942EF88AF6D7
    claim_text: The Jev timeout must be at most 120000 milliseconds
    role: normative
    status: modeled
    span:
      start: 613
      end: 664
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-E5A884DFD4D8137F
    claim_text: A malformed KIBI_JEV_TIMEOUT_MS value is an invalid timeout input and must fail closed before any network call
    role: normative
    status: modeled
    span:
      start: 666
      end: 776
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-DE8F089404951DE7
    claim_text: Explicit programmatic Jev options must override environment defaults
    role: normative
    status: modeled
    span:
      start: 778
      end: 846
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-C2DD641ADEBB94B4
    claim_text: Effective provider model identity must be exposed in plugin provenance
    role: normative
    status: modeled
    span:
      start: 848
      end: 918
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-A29D577A4E285B4A
    claim_text: kibi doctor must report configured plugin package, capability, mode, and declared dependency status as a provider diagnostic without importing the plugin package
    role: normative
    status: modeled
    span:
      start: 920
      end: 1081
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9E850C720B4CF5F9
    claim_text: kibi doctor must fail the provider diagnostic when a configured plugin package is not a declared dependency
    role: normative
    status: modeled
    span:
      start: 1083
      end: 1190
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-5EB9113DC061789C
    claim_text: A generic executable kibi.config.ts file must be absent from v1
    role: normative
    status: modeled
    span:
      start: 1192
      end: 1255
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-6D5C825727F4F609
    claim_text: A generic arbitrary plugin-options bag must be absent from v1
    role: normative
    status: modeled
    span:
      start: 1257
      end: 1318
    payload_hash: 62dd897ae8c432e3611ac6836cff2418cc718f831f221cf1637269c9f0c98fef
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
proof_exempt: false
id: REQ-capability-plugin-configuration-v1
type: req
---
# REQ-capability-plugin-configuration-v1

package.json kibi.plugins must be the canonical v1 capability plugin activation and mode surface. Plugin secrets must be supplied from the process environment outside repository plugin configuration. The TYPESAFE_API_KEY provider setting must come from the process environment source when a real TypeSafe client is required. The Jev model must default to jev-latest. A blank KIBI_JEV_MODEL provider setting from the environment source must remain unset. KIBI_JEV_MODEL must optionally select the Jev model as a provider setting from the process environment source. The Jev timeout must be at least 1 millisecond. The Jev timeout must be at most 120000 milliseconds. A malformed KIBI_JEV_TIMEOUT_MS value is an invalid timeout input and must fail closed before any network call. Explicit programmatic Jev options must override environment defaults. Effective provider model identity must be exposed in plugin provenance. kibi doctor must report configured plugin package, capability, mode, and declared dependency status as a provider diagnostic without importing the plugin package. kibi doctor must fail the provider diagnostic when a configured plugin package is not a declared dependency. A generic executable kibi.config.ts file must be absent from v1. A generic arbitrary plugin-options bag must be absent from v1.
