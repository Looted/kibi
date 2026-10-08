---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
---

Built-in predicate schemas now declare the allowed values of arguments with a natural closed vocabulary, so `kb_model` mode `predicates` lists them as `allowedValues` when the claim does not name one and binds them when it does in other words. For example the `trigger` of `commit_action`, `discard_action` and `transition` is one of `escape`, `cancel`, `submit`, `navigation`, `click`, `timeout`, "when the session times out" binds `timeout`, and "must be denied" binds the decision `deny`. A granted permission in a `permission_rule` suggestion is now spelled `allow` (it was `assert`, the polarity, which stays `assert`). Existing predicate facts are unaffected: built-in vocabularies guide suggestions and are not enforced on stored facts.

Technical summary: new `predicate-closed-vocabularies.ts` declares `argument_constants` and `argument_aliases` for `trigger` (commit_action, discard_action, transition), `decision` (permission_rule, scoped_authorization_rule: allow, deny; `assert` is an alias of `allow`), `policy` (refresh_policy_rule: automatic, manual, on_demand), `decision` (environment_safety_rule: allowed, forbidden, read-only), `operator` (resource_constraint), `unit` (retention_policy: days, months, years) and `action` (coding_standard_rule: use, avoid; lifecycle_rule: archived, deleted, expired). Schema examples use the declared constants. Binding cues map wording such as "denied", "must not", "times out" and "on demand" to their constant, and `inferTrigger` recognizes clicks and timeouts.
