# Signoff views

`kibi signoff` renders what a person signs off, so the agent never retypes
requirement text from memory. It is a CLI command, not an MCP tool.

| View | Command | When |
| --- | --- | --- |
| Decisions to confirm | `kibi signoff --questions <file or ->` | Mid-work: rules to record as firm, a change to a recorded rule, a conflict |
| Requirements signoff | `kibi signoff` (`--staged` for the index) | End of work: before asking to commit |

Both print a fenced block by default (`--format md`): ```` ```kibi-questions ````
or ```` ```kibi-signoff ````. Paste it unchanged. `--format html --open`
writes and opens a self-contained page; `--format json` prints the view.
Every run also writes `.kb/briefs/signoff/latest.json`, `latest.md` and
`latest.html` (git-ignored), which editor plugins show.

## Questions input

`{"questions":[...]}` or a bare array. Each question:

| Field | Required | Meaning |
| --- | --- | --- |
| `statement` | yes | The rule as it would be recorded |
| `title` | no | A short name for the card |
| `id` | no | The recorded requirement the question would change; the view quotes its current statement and firmness |
| `quote` | no | The person's words that would go in `origin.ref` |
| `firmness` | no | `firm`, `default` or `exploratory`, as it would be recorded |
| `governs` | no | Files or symbols the rule governs |
| `conflictsWith` | no | Recorded requirement ids it conflicts with; the view quotes them |
| `question` | no | What you ask, when it is more than "record this?" |
| `answer` | no | The person's answer; answered questions are struck out |

The person answers by number ("1 yes, 2 exploratory, 3 reword: ..."). Copy
each answer into `answer`, render again, and record the rules only once every
question is answered. An answer is the person's words: quote it in
`origin.ref`; a view itself is never an approval.

## Summary contents

| Section | Meaning |
| --- | --- |
| New | Requirement documents the change adds |
| Changed | Rewritten requirements; a changed statement shows before and after |
| Affected by the code change | Unchanged requirements whose implementing code changed (the `requirement_statement_unverified` set) |
| Superseded or retired | Requirements the change retires, supersedes or deletes |

Each requirement shows its firmness, origin, superseded rules, changed code
symbols, scenarios and proof state (the earliest unmet proof gate). Parts
Kibi could not compute are named in a `Note:` line instead of failing.
