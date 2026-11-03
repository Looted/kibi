---
"kibi-cli": patch
---

Tighten a few edge-case guards found while pinning the small CLI modules with mutation tests: a `.git` marker that cannot be inspected for a reason other than being absent (such as a symlink loop) now refuses repository detection instead of being treated as missing; a workspace source path that resolves to the workspace root itself is no longer accepted as a source file; relationship shard removal reads each shard once, so the removal plan and the bytes it rewrites always come from the same text; and a shard whose `relationships` key holds a mapping instead of a list is now rejected rather than left silently unchanged.
