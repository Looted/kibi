---
"kibi-cli": patch
"kibi-mcp": patch
---

`kibi check --changed <paths>` run from a subdirectory of the workspace now reads the paths from that directory, as other path options already did. A named path that is neither in the working tree nor tracked by git is now refused with an error that names it; it used to be skipped, so the check judged nothing and passed. `kb_check` with `changed: true` now passes a `sourceFiles` entry that starts with `-` as a path, where it used to be read as an option of `kibi check` (such as `--rules`), so the verdict came from a different run.
