---
"kibi-opencode": minor
"kibi-cli": patch
"kibi-runtime": patch
---

OpenCode now runs the decision hooks the other hosts run. A message that states a rule is noted, and the note and a fill-in `kb_record` capture template are added to the result of the session's first source edit. An edit of code that implements a firm requirement is stopped once with the notice to ask the person first (the same edit tried again goes through; `KIBI_CONFIRM_FIRM_EDITS=0` turns this off). When a session that changed source and recorded nothing goes idle, the plugin sends the capture request once (or the signoff request after requirement writes). Shell in-place edits count as source edits. These need the OpenCode v1 plugin hooks (`chat.message`, `tool.execute.before`, `session.idle`); the v2 plugin API exposes none of them yet, so under v2 these behaviours are off.

The managed AGENTS.md section now says to ask before editing code that implements a firm requirement and to record the verdict with `kibi review-firm-edit`, so agents without a Kibi plugin learn it before the commit gate refuses the change.
