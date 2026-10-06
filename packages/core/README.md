# kibi-core

The Prolog knowledge-base core of [Kibi](https://looted.github.io/kibi/): the entity and relationship schema, validation rules, inference, contradiction and proof checks that `kibi-cli` and `kibi-mcp` run against a repository's `.kb/` directory.

This package ships Prolog sources only (`src/kb.pl` is the entry module). You do not call it directly; install it with the CLI and MCP server:

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
```

The [entity schema](https://looted.github.io/kibi/reference/entity-schema.html) and [inference rules](https://looted.github.io/kibi/reference/inference-rules.html) references describe what it encodes.

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
