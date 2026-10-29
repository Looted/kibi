---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-claude": minor
---

Kibi now sends anonymous usage statistics, so its maintainers can see which operations people use, how long they take and how they fail, including in cloud and ephemeral environments where the local diagnostic log is lost. Only fixed names, statuses, durations, error categories, versions and platform are sent. Code, paths, queries, KB content and repository names never are. Turn it off with `kibi telemetry disable`, `KIBI_TELEMETRY=0` or `DO_NOT_TRACK=1`. It is also off in CI and test runs.

- kibi-agent-core adds `usage-telemetry`, a shared queue and batch sender for PostHog, with a random install id, hashed session ids and no person profiles.
- kibi-mcp records one `kibi_operation` event per tool call, sends the queue every minute and on shutdown, and prints a one-time notice to stderr.
- kibi-cli records one event per command, adds `kibi telemetry status|enable|disable`, and prints the one-time notice.
- kibi-claude records one `kibi_hook` event per hook decision and sends the queue from the Stop hook.
