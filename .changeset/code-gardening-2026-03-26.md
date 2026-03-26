---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Internal code quality improvements: deduplicate splitTopLevel and check types across packages, extract shared Prolog cleanup helper, replace process.exit() with return values in CLI commands, remove dead code (target-resolver.ts), annotate empty catch blocks, and remove unreachable code paths.
