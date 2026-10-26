---
title: A maintainer proves the requirement claims a certificate establishes
status: active
priority: should
tags:
  - proof
  - certificate
origin:
  kind: agent
  recorded_at: '2026-10-25T18:21:07.714Z'
id: SCEN-kibi-claim-bound-proofs
type: scenario
---
Given a requirement whose claim "Palette colors must be one of red, green or blue" the semantic advisor models as a set fact, when the maintainer runs kibi prove on exhaustive tests whose proof contracts name that claim in proves, then the test over a domain that is exactly the set, linked covered_by the test, gets a derived claim binding and kibi prove prints it, while a test over a domain missing a member and a test naming a key that is no claim of the requirement get rejected bindings that say why. kibi check fails the contracts that cannot prove their claims and a certificate contract without proves, and kibi proof explain lists each claim with its bindings. A requirement is proved only when every applicable claim has a derived, code-scope binding; otherwise it stays tested and coverage shows how many claims are proved.
