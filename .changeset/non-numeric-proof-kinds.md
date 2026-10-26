---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Formal proofs now reach claims that are not numbers. Three new certificate proof kinds read their model from the code and decide the claim exactly:

- `rule`: Kibi calls the code's predicate functions (`predicate_source`) on every combination of the finite domains the code exports (`domains`) and model checks the claim's fact against that table. A `kibi.logic.v1` rule must hold for every assignment of its variables, a predicate fact (including decision predicates such as `permission_rule`) must be decided as it says, and a set fact whose property names a predicate needs it to hold for every member. A failure names the assignment that breaks the rule.
- `state_machine`: Kibi reads a transition table or a `next(state, event)` function and checks the transitions, states, initial, terminal or reachable states a set fact names, exactly. Rules over a machine can use `transition`, `reachable`, `initial`, `terminal` and `state`.
- `regex`: Kibi decides whether the code's pattern (a JavaScript `RegExp` or a Python `re.compile`) accepts exactly the strings a fact's pattern describes, with each engine's own semantics for anchors, `.`, `\d` and case folding, and reports the shortest string only one side accepts. Patterns outside the regular subset (backreferences, lookaround, word boundaries and similar) are refused with the reason. A string constant is checked against an exact string fact the same way.

String facts gain the `matches` operator, and the semantic advisor models "X must match `re`", "X must be `value`" and "X transitions must be one of a -> b, ..." (and terminal, initial or reachable states) as facts these kinds prove. A `typecheck` proof of a set fact with `property_key: required_fields` checks that every member is a required, non-nullable field of the domain type. `kibi-cli/proof-certificates` adds `ruleCertificate`, `stateMachineCertificate`, `regexCertificate` and `failedCalls`.

The kibi-usage skill (2.29.0) explains the new kinds.
