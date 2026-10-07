---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

`kibi check` now blocks a requirement whose advisor ledger still has unmodeled (`missing`) propositions when it `relates_to` a requirement that is modeled with strict property or ground predicate facts. Until now such a requirement passed clean: `domain-contradictions` compares grounded facts only, so a new requirement that quietly described different behavior for the same subject was never compared with the modeled one it linked to. The finding names the modeled subject and property keys (or predicate keys) and asks for the missing propositions to be modeled against them, or for a `supersedes` decision.

New canonical rule `related-requirement-unmodeled` (Prolog, `check_related_requirement_unmodeled/1`) is registered in `rule-registry.json` and runs by default. It follows `relates_to` in either direction, counts only `status: missing` inventory entries, and reports nothing for requirements without a ledger (strict-readiness lane), for ledgers whose assertive propositions are modeled or explicitly classified, for neighbours that model nothing, and once the older requirement is superseded.
