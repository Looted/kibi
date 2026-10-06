# kibi-cli

The `kibi` command-line interface for [Kibi](https://looted.github.io/kibi/), an agent-native requirements compiler and enforcement layer. Kibi keeps a branch-local knowledge base of requirements, scenarios, tests, facts and code-symbol links in your repository's `.kb/` directory and checks it with Prolog.

Most people install `kibi-cli` together with `kibi-core` and `kibi-mcp`, then let their coding agent drive it.

## Install

Requires Node.js 22+. SWI-Prolog is bundled for Linux (x64/arm64, glibc 2.28+) and macOS (Apple silicon/Intel); elsewhere, install SWI-Prolog 9.0+ and put `swipl` on your `PATH`.

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
npm exec -- kibi init
```

Do not install with `--omit=optional`: the bundled SWI-Prolog runtime is an optional dependency. The [installation guide](https://looted.github.io/kibi/guide/install.html) covers pnpm, Yarn and Bun.

## Common commands

```bash
kibi init       # create the .kb/ layout and Git hooks
kibi doctor     # diagnose the environment, including which SWI-Prolog is used
kibi sync       # rebuild the KB from the checkout
kibi status     # freshness and health of the current branch's KB
kibi search     # ask a question of the KB
kibi check      # validate traceability, contradictions and semantics
kibi report     # write the kibi-report/ health page and badge
kibi migrate    # preview and apply KB schema upgrades
```

Agents without MCP can call the same operations through JSON routes, for example `printf '%s\n' '{...}' | npx --no-install kibi <route> --input -`. See the [CLI reference](https://looted.github.io/kibi/reference/cli.html) for every command and route.

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
