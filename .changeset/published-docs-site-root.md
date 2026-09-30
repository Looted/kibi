---
"kibi-cli": patch
"kibi-cursor": patch
"kibi-opencode": patch
---

The badge that `kibi init --github` adds to your README now links to the published explanation of the `% proven` metric at https://looted.github.io/kibi/ instead of the GitHub rendering of the Markdown source. The Kibi documentation site moved to the root of that domain, with the requirement-health report still under `/kibi-report/`; old `/docs/` page links redirect to the same page. The Cursor and OpenCode package READMEs also link to the published guides, so the links work when you read them on npm.

- cli: `KIBI_METRIC_DOCS_URL` points at `https://looted.github.io/kibi/guide/github-integration.html#what-the-badge-means`.
- cursor, opencode: README setup and troubleshooting links point at the published guide pages instead of repository-relative or GitHub blob URLs.
- repo tooling (not published): the docs site builds into the GitHub Pages root, writes redirects for every former `docs/` page, and renders `llms.txt` as one H2 link list per catalog group from the shared page metadata.
