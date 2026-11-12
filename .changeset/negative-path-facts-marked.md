---
"kibi-cli": minor
"kibi-core": minor
---

`kb_search` no longer presents a forbidden situation as if it were true. A negative-path fact (a fact that a scenario expecting rejection or error assumes, such as "Building a migration plan changes a tracked file") used to appear as a plain, unmarked result or as the top search hint for an unrelated question. It is now marked as a forbidden situation everywhere search shows it and ranks below the requirement it guards. Authored titles are unchanged and nothing needs migrating.

- kibi-core: `kb_negative_path_facts/2` returns the negative-path facts among a set of ids, each with the current requirements whose rejecting scenarios assume it.
- kibi-cli: intent-v1 results carry `negativePath` (`polarity: "forbidden"`, `guards`) on such a fact and rank it directly below a guarded requirement that also matched; it no longer counts as that requirement's rival for `ambiguous`. The text digest names it as a forbidden situation, the `kibi search` table and an answer-layer `ungoverned` entry title it `Forbidden: …`, and a search hint on it is shown as the requirement it guards (`via` names the fact), or as itself titled `Forbidden: …` when it guards no current requirement. MCP and CLI share the same operation, so every agent host and the plain CLI get the same marking.
