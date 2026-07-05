---
"kibi-cli": patch
---

`kibi check --staged` no longer treats ordinary README markdown without YAML frontmatter as a Kibi entity just because it lives under a typed documentation directory. Documentation-only README edits can now pass staged validation without requiring test-entity frontmatter.

- Skip Markdown entity extraction for staged `.md` files that do not contain YAML frontmatter.
- Add a staged-check regression for README files under `documentation/tests/`.
