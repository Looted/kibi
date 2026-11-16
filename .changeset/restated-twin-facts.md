---
"kibi-core": patch
"kibi-cli": patch
---

`kibi check` no longer reports identical value facts as one claim minted twice (`subject-key-identity`) when every pair of them is grounded by requirements linked by `restates` or `supersedes`. A requirement that restates another in its own words grounds its own fact, because a fact carries the claim key of one wording; putting both facts on one subject and property lets `domain-contradictions` catch a value changed in one place and kept in the other. A group with a fact whose requirement restates none of the others is still reported in full. `domain-redundancy` already exempted these pairs.
