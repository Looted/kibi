# Kibi search hints plugin

This package provides the `kibi.search-hints.v1` capability. When `kb_search` gives a weak or abstained lexical answer, Kibi asks it which current entities the question is probably about, and shows up to ten of their requirements under `queryAnalysis.hints` and in one sentence of the text answer. The agent then re-asks in the KB's own words. Hints never change search results, the governing answer, abstention, `kb_check` or proofs.

It ships with Kibi and is on by default: a project whose `package.json` `kibi.plugins` names no provider for `kibi.search-hints.v1` gets it as the `replace` provider, with no setup. Turn it off by listing it in `kibi.declinedPlugins`, for example when the knowledge base is not written in English (the model is English-only), when the environment does not allow a bundled model, or when another provider is configured instead:

```json
{
  "kibi": {
    "declinedPlugins": ["kibi-plugin-search-hints"]
  }
}
```

A `kibi.plugins` entry for the capability, from any package and in any mode, takes the place of the default. To pin this plugin at a version of your own, install it as a dev dependency and activate it explicitly:

```json
{
  "kibi": {
    "plugins": [
      {
        "package": "kibi-plugin-search-hints",
        "capabilities": { "kibi.search-hints.v1": { "mode": "replace" } }
      }
    ]
  }
}
```

Use `"mode": "shadow"` to compute hints for comparison without showing them. `kb_search` with `hints: false` skips them for one call.

The plugin embeds text with the bundled potion-base-8M static embedding (256 dimensions, int8, about 7.7 MB): a text's vector is the normalised mean of its tokens' table rows. It is pure TypeScript with no native code and no network access, and the same text gives the same vector on every platform. Entity vectors are cached under the directory Kibi passes in, keyed by the model and each entity's content hash, so only changed entities are re-embedded. The model is English-only.

See `catalog.json`, `integrity.json`, `SBOM.spdx.json` and `THIRD_PARTY_NOTICES.md` for the shipped component record.
