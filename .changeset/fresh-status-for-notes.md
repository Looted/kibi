---
"kibi-core": patch
---

Kibi status no longer reports a fresh snapshot as stale just because the repository contains ordinary Markdown notes. Entity-shaped documentation is still tracked for freshness, while generic notes remain informational.

- Restrict Prolog freshness scans to Markdown files with Kibi entity frontmatter.
