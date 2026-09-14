---
"kibi-cli": minor
---

Staged checks now account for every path in the Git index, so Python, shell, YAML, Dockerfiles, Markdown, JSON, and other readable text changes no longer disappear behind a misleading “No staged files found” result. These formats receive advisory ownership and impact review, while binary files, unsupported encodings, symlinks, and submodules are listed with clear skipped reasons.

Preserve the existing JavaScript and TypeScript enforcement contract, read staged and deleted content from Git, resolve file ownership only from committed plus staged Kibi evidence, and emit a single structured JSON envelope with per-file coverage for every staged-check outcome.
