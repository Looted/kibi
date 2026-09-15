---
"kibi-core": patch
---

Requirement proof reports now require every linked scenario to have qualifying,
current passing end-to-end evidence. Missing, stale, failed, malformed, or
contract-mismatched evidence remains visible as a blocking proof gap, while
unit and integration helpers remain nonblocking ancillary evidence.

- Evaluate receipt obligations per scenario and expose their diagnostics in
  `proofStages.passingE2e.scenarioObligations`.
- Isolate the core Prolog fixture store per test process and verify two
  simultaneous process stores cannot observe each other's entities.
