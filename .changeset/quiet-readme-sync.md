---
"kibi-cli": patch
---

Kibi sync no longer treats README files inside configured entity directories as entities. This prevents human documentation such as fixture READMEs from producing missing-frontmatter warnings or failed background syncs while preserving normal entity markdown discovery.

- Ignore `**/README.md` during CLI sync markdown discovery.
- Add regression coverage for README exclusion in sync discovery.
