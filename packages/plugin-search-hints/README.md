# Kibi search hints plugin

This package provides the `kibi.search-hints.v1` capability. On every `kb_search` over decisions, Kibi asks it to score each requirement and ADR, and the scenarios, tests and facts each one links, by similarity to the question (up to 50,000 entities per request). Kibi fuses those scores with the word ranking of the five decision cards at half weight, and lists up to seven more decisions related by meaning under `queryAnalysis.hints` and in one sentence of the text answer. The scores never change `kb_check` or proofs, and a provider that fails or times out leaves the search ranking by words alone.

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

Use `"mode": "shadow"` to compute scores for comparison without using them. `kb_search` with `hints: false` ranks by words alone for one call.

The plugin embeds text with the bundled potion-retrieval-32M static embedding (512 dimensions, int8, about 33 MB), a model2vec model tuned for retrieval: a text's vector is the normalised mean of its tokens' table rows. It is pure TypeScript with no native code and no network access, and the same text gives the same vector on every platform. Entity vectors are cached under the directory Kibi passes in, keyed by the model and each entity's content hash, so only changed entities are re-embedded. The model is English-only.

See `catalog.json`, `integrity.json`, `SBOM.spdx.json` and `THIRD_PARTY_NOTICES.md` for the shipped component record.
