---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
---

The file-context hint that hooks inject now points agents at `kb_query({id, includeBody:true})`, which returns the requirement's full body including why it exists. The hint previously suggested `kb_query({id})`, which returns the statement without the body.
