---
"kibi-plugin-ui": minor
"kibi-plugin-sdk": minor
"kibi-plugin-builtin": minor
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Projects with a UI can opt into the experimental `kibi-plugin-ui`, which keeps agents on the agreed design: `kb_check` then requires every React or Angular component to implement a design requirement and blocks a component that loses the class names or test ids marking its agreed pattern, such as a timeline rewritten as cards. `/kibi-bootstrap` offers the plugin when it finds component files, and a declined offer is remembered in `package.json` `kibi.declinedPlugins`. Requirements that only name a UI pattern are now proved by fresh isolated component tests, so pattern rules do not need browser tests. Projects without the plugin see no new blocking findings.

- Add the `kibi.check-policy.v1` capability to `kibi-plugin-sdk`: a JSON policy with ownership and pattern-marker rules, validated by `validateCheckPolicyDocument`. `kb_check` reads activated policies as data from the package and never imports plugin code; an unreadable policy blocks. The builtin plugin ships an empty policy.
- Add the canonical `policy-ownership` and `policy-markers` rules (inert without an activated policy) to the rule registry, the `kb_check` schema and the CLI.
- Add built-in `ui_pattern`, `same_pattern`, `pattern_marker` and `ui_container` predicate schemas with suggestion keywords.
- Proof ladder: a scenario whose requirements are grounded only in `ui_pattern`, `same_pattern` and `pattern_marker` accepts `unit` and `integration` tests with fresh receipts; each scenario obligation now reports `acceptedScopes`.
- `kb_plan_bootstrap` returns `pluginOffers` and a `plugin_offer` recommended action; `kibi.declinedPlugins` is validated as a list of bare package names. The `kibi-bootstrap` and `kibi-usage` skills cover the offer and the UI pattern workflow.
- New package `kibi-plugin-ui` ships the UI design policy. It is optional and not part of the default install.

Migration: none required. To enable the guard, install `kibi-plugin-ui` as a dev dependency and activate `kibi.check-policy.v1` in `augment` mode under `package.json` `kibi.plugins`; expect `policy-ownership` findings for existing components until they are linked to design requirements or tagged `review:ui-unconstrained`.
