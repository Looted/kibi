---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-cursor": patch
---

The `kibi-usage` proof guide says that a `calls` claim excludes only the members it names: "never call `exec.Command`" still proves for code that uses `exec.CommandContext`, `&exec.Cmd{...}` or `exec.LookPath`. For a rule like "never run a process", list every member that does it, or use a prefix such as `os/exec.*`.
