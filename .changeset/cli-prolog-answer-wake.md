---
"kibi-cli": patch
---

Answer an interactive Prolog query as soon as both of its frame ends have been read, waking the caller from the pipe callback instead of `setImmediate`. Under Bun, a caller waiting from a nested promise wait (for example `expect().resolves`) no longer resumes only at the next unrelated timer, and errors reported on stderr are classified even when stdout is read first.
