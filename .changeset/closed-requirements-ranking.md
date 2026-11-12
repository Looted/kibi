---
"kibi-cli": minor
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Search and the edit hooks no longer treat a closed requirement as if it were current. A closed requirement may be done and still hold, so it stays findable, but it now ranks below a current requirement that matches as well, and a closed requirement that a current one supersedes is no longer offered as a candidate for a file no symbol links.

- `kb_search` scores a closed requirement that no current requirement supersedes at 0.75 of its match and gives the reason `demoted: closed`. The answer applies the same factor to a closed requirement reached through a matched fact, scenario or test, so it follows a current requirement reached as well in `governing`. A superseded requirement keeps its 0.5 demotion.
- The answer proposes the replacement of a superseded requirement only when that requirement scored at least 0.8 of the best candidate's score, so a weak match on an old requirement no longer pulls its replacement into an unrelated answer. The old requirement still names its replacement under `notGoverning`.
- The edit hook note (every host) and an impact `kb_check` for an unlinked file list current candidate requirements before closed ones and leave out a closed requirement that a current requirement supersedes, read from front matter links and relationship shards. kibi-agent-core exports `replacedRequirements` for this.
