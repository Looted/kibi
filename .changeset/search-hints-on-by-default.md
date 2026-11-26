---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-plugin-search-hints": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

Search hints are now on by default. `kibi-plugin-search-hints` ships with `kibi-cli` and `kibi-runtime` (and so with the MCP server and every agent integration). On every default `kb_search`, its meaning scores are fused into the decision-card ranking and up to seven additional related decisions appear in `queryAnalysis.hints.items`, with no setup. A project that names its own `kibi.search-hints.v1` provider in `kibi.plugins` keeps it, in any mode, and `kb_search` with `hints: false` still skips hints for one call.

The bundled model package adds about 33 MB to an install. Its model is English-only. To turn the default off, for example because the knowledge base is not written in English, the environment does not allow a bundled model, or another provider is configured instead, list the package in `package.json`:

```json
{ "kibi": { "declinedPlugins": ["kibi-plugin-search-hints"] } }
```

The provider stamp of the bundled plugin reads `external: false`, which tells it from a provider the project configured. Bootstrap no longer offers the plugin, and the bootstrap and usage skills say it is on and how to turn it off.
