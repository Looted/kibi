---
"kibi-opencode": patch
---

Fix several edge cases in the OpenCode plugin's file analysis. Python files with Windows (CRLF) line endings and `#` comments no longer hang the comment analysis, and CRLF `symbols.yaml` manifests are now read. A one-line Python docstring (`"""Summary."""`) no longer swallows the code after it, a string after a class or function body is no longer taken for the module docstring, and indented `/** ... */` comments lose their opening marker. Knowledge-file detection now matches only the canonical `.kb` paths (for example, `.kb/requirementsX.md` is no longer treated as a requirement document), and TEST document tags are read only from the `tags:` list itself. Unreachable branches in the sync scheduler, checkpoint runner and smart-enforcement handlers were removed without changing behavior.
