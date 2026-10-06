# kibi-runtime

The first-party runtime surface for [Kibi](https://looted.github.io/kibi/) operations. Kibi's adapters, including `kibi-mcp`, import operation contracts, the operation catalog and the dispatcher from this package instead of reaching into CLI internals. It also brings in the bundled SWI-Prolog runtime (`kibi-swipl`) and the default capability plugins (`kibi-plugin-builtin`).

It is an internal building block, installed as a dependency of `kibi-mcp`. Its exports are deliberately narrow and follow Kibi's own needs, so it is not a general-purpose API. To use Kibi, install `kibi-core`, `kibi-cli` and `kibi-mcp` as described in the [quick start](https://looted.github.io/kibi/guide/quick-start.html).

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
