---
"kibi-vibe": minor
---

The Vibe hooks now share the decision guard the other adapters use. A prompt that states a rule gets the rule note (with the person's reason when the prompt gives one). After an edit of code that implements a firm requirement, the post_tool context names that requirement once per session and asks the agent to undo an edit that breaks it unless the person agrees; `KIBI_CONFIRM_FIRM_EDITS=0` turns this off. The session's first source edit after a rule prompt gets the rule-capture template, and session start names missing Kibi git hooks. The guard is bundled with kibi-agent-core into `bin/hooks/kibi-guard.mjs`, so a copied plugin needs no install.
