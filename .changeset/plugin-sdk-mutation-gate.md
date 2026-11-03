---
"kibi-plugin-sdk": patch
---

Drop validation branches that could never run (a repeated package/capability pair, a non-record symbol after the legacy check, out-of-range line lengths after the line check). Every validator message and code is unchanged.
