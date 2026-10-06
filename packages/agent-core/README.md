# kibi-agent-core

Shared, low-latency helpers for [Kibi](https://looted.github.io/kibi/) agent-host adapters. The Claude Code, Cursor, Codex, OpenCode and ZCode integrations use it to build the short requirement snippets their hooks show before an agent reads or edits linked code (the requirement, what it must keep true, the decision behind it and its tests), to classify paths, and to log opt-in hook usage.

Entry points: `kibi-agent-core`, plus the subpaths `/snippets`, `/knowledge-index`, `/path-policy`, `/kb-mcp-tools` and `/hook-usage-log`.

It is an internal building block of the host plugins, not something you install by hand. To use Kibi, see the [quick start](https://looted.github.io/kibi/guide/quick-start.html).

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
