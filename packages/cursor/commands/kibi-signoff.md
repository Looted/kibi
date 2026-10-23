---
name: kibi-signoff
description: Show the Kibi requirements signoff view for the current change, or the decisions waiting for the person
---

# Kibi signoff

Show the person what they sign off, quoted from the knowledge base rather than
retold from memory.

1. If decisions are waiting for the person (rules to record as firm, a change
   to a recorded rule, a conflict), build the questions view as the
   `kibi-decisions` skill describes (`resources/signoff-views.md`) and run
   `npx --no-install kibi signoff --questions -` with the questions on stdin.
2. Otherwise run `npx --no-install kibi signoff` (add `--staged` for the
   staged changes only).
3. Put the command's output in your reply unchanged. It is plain Markdown that
   renders as headings, quotes and lists; do not wrap it in a code block or
   summarize it.
4. Offer the full page too: `npx --no-install kibi signoff --format html --open`
   opens it in the browser on this machine, and
   `.kb/briefs/signoff/latest.html` is the same self-contained page to attach
   when the person is not on this machine.

A view is never an approval: record a rule as approved only from the person's
answer, quoted in `origin.ref`.
