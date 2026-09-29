---
"kibi-cli": patch
"kibi-core": patch
---

Kibi no longer fails to save anything when a workspace sits deep in a directory tree. In a repository whose path was around 150 characters or longer, every `kb_upsert` and other write died with "invalid term_t … out of range" and no hint about the cause. Writes now work at any path length. Two smaller rough edges are fixed as well: `kibi init` no longer blames `core.hooksPath` when it refuses a hooks directory that escapes the repository through a symlink, and the "Pending source is missing" error now says how to recover.

- kibi-core: SWI-Prolog's `rdf_db` cannot write a journal for a graph whose URI is roughly 230 characters or longer. Journaled stores whose `file://` graph URI would exceed 200 characters now use a short digest-based `urn:kibi:store:<sha1>` graph URI; shorter paths keep their existing URI, so existing stores are unaffected.
- kibi-cli: `init` reports "The Git hooks directory resolves outside this repository" unless `core.hooksPath` is actually configured.
- kibi-cli: `Pending source is missing` errors (sync and discovery) point to `kibi branch recover --apply` for deliberately deleted sources.
