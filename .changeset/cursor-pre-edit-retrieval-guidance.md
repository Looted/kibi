---
"kibi-cursor": minor
---

The Cursor plugin now asks the agent to consult Kibi before it edits a file, not only after. Every nudge used to fire once the change was already written — the post-edit message opened with "After editing" twice — so the plugin could only ever prompt repair, never inform the change. Before an edit, the plugin now names the requirements that file already implements and asks for them to be read first, which is the one point where retrieval can still change what gets written.

- Emit source-linked pre-edit guidance from `preToolUse` for edit-like tools, resolved synchronously from the symbol manifest so no KB round-trip is added to the edit path.
- Name up to three linked requirements for the file, or ask for discovery and ownership when the file owns none.
- Narrow the post-edit message to the impact review that only becomes possible once the change exists, and stop repeating the retrieval ask there.
- Track pre-edit guidance in its own hook-state bucket so it is emitted once per path without suppressing the post-edit review.
