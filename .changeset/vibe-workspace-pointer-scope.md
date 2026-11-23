---
"kibi-vibe": patch
---

The `kibi-workspace.txt` pointer no longer redirects a session whose folder is inside another Git repository without a KB, so hooks and the MCP server in other projects keep their own folder instead of reading one shared KB. The pointer still applies outside any repository and when the host spawns from the plugin's own directory.
