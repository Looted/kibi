---
"kibi-cli": patch
"kibi-cursor": patch
"kibi-claude": patch
---

Setting up Kibi no longer starts with installing SWI-Prolog. The documentation now says that Linux (x64 and arm64, glibc 2.28 or newer) and macOS (Apple silicon and Intel) need nothing beyond Node.js 22, explains the lookup order and the `KIBI_SWIPL` and `KIBI_SWIPL=system` overrides, and shows how `kibi doctor` reports which SWI-Prolog is in use and what to do when an install skipped the bundled runtime (`--omit=optional`, pnpm `supportedArchitectures`). Manual instructions stay for Alpine and native Windows. The GitHub Pages report workflows that `kibi init` can write no longer install SWI-Prolog by hand, because `npm ci` brings the bundled runtime with it.

- kibi-cli: drop the `apt-get install swi-prolog` step from the shipped `kibi-report.yml` and `kibi-badge.yml` workflow templates.
- kibi-cursor, kibi-claude: README and plugin manifest prerequisites say SWI-Prolog is bundled on supported platforms and only needed on `PATH` elsewhere.
- Kibi's own CI and proof now run the pipeline-built bundled SWI-Prolog (one job keeps a system install with `KIBI_SWIPL=system`), and the release dry run follows the README quick start with the packed tarballs on four platforms; neither ships in a package.
