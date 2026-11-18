---
"kibi-claude": patch
---

In Claude Code, a `keeps` receipt recorded after the hook asked about an edit of firm code now lets through only a retry of that same edit. The receipt judges the code before the edit, so it used to let any later edit of the symbol through for the rest of the session; another edit is now asked about again. The commit gate already required a receipt for the final code.
