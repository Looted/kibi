---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

An abstained or weak `kb_search` answer now says what to do next in its structured result, not only in the text. When the first page of a search abstains or matches weakly, `nextActions` holds a `kb_query` that lists the requirement titles (of the `type` filter when one is given), with the reason that a weak or abstained search is not evidence that nothing is recorded and that the titles show the words to search with. Weak and abstained searches also carry a `notes` field with the corresponding guidance. A file path written in the question adds a `kb_search` next action that repeats the question with that path as `sourceLocations`, and a question about contradictions adds a `kb_check` next action with the `domain-contradictions` rule; both mirror advice the text already gave.
