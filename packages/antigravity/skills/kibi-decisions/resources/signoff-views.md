# Signoff views

`kibi signoff` renders what a person signs off, so the agent never retypes
requirement text from memory. It is a CLI command, not an MCP tool.

| View | Command | When |
| --- | --- | --- |
| Decisions to confirm | `kibi signoff --questions <file or ->` | Mid-work: rules to record as firm, a change to a recorded rule, a conflict |
| Requirements signoff | `kibi signoff` (`--staged` for the index) | End of work: before asking to commit |

Both print plain Markdown by default (`--format chat`): headings, quoted
statements and lists that render in any chat or messaging surface. Put it in
your reply unchanged: never wrap it in a code block, summarize it or retell a
requirement in your own words. Every run also writes
`.kb/briefs/signoff/latest.json`, `latest.md` and `latest.html` (git-ignored);
`latest.html` is a self-contained page with the full view, meant to be opened
in a browser or published as a page, not attached as a file.

## Showing it on your host

| Host | Best view |
| --- | --- |
| Claude Code, Codex, Cursor, ZCode, VS Code chat | Paste the default output; `/kibi-signoff` (Claude Code, Cursor, ZCode) runs it. Offer `kibi signoff --format html --open` for the page |
| OpenCode terminal | `kibi signoff --format md` and paste the fenced block unchanged: kibi-opencode draws it as a card, and `/kibi-signoff` reopens it |
| Replies sent through a messaging tool (cloud or project threads, chat bots) | Pass the default output as the message text. Share `latest.html` only as a rendered page: in Claude apps (claude.ai, the mobile and desktop apps, Claude Code on the web) publish it with the Artifact tool and give its link. Never attach the `.html` as a file: the Claude apps, Slack and most chat apps show it as raw source or a download. With no page tool, the message text is the whole view |
| VS Code or Cursor with the kibi-vscode extension | The **Kibi: Show Requirements Signoff** panel follows every run |
| Remote machine, no browser | Give the person the path of `latest.html` |

`--format md` wraps the same Markdown in a ```` ```kibi-signoff ```` or
```` ```kibi-questions ```` fence for host renderers; use it only where one
draws it, because everywhere else a fence shows as raw code.
`KIBI_SIGNOFF_FORMAT` sets the default for a host. `--format html --open`
writes and opens the page; `--format json` prints the view.

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
`origin.ref`; a view itself is never an approval. Record the answers on the
branch of the change they approve and push them to its pull request, never to
a separate one.

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
