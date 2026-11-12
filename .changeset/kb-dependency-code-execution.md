---
"kibi-cli": patch
---

Reading a KB dependency can no longer run code the dependency chose. A `git` or `ref` value in `.kb/dependencies.json` or its lock that starts with `-` is refused, so it cannot reach git as an option such as `--upload-pack`, and a process that serves a dependency checkout ignores the plugins and env files that checkout declares. Technically: dependency URLs and refs are validated on read and passed after `--end-of-options`, fetches run with `protocol.ext.allow=never`, and `readProjectKibiConfig` and the env bootstrap skip the project files when `KIBI_KB_DEPENDENCY` is set.
