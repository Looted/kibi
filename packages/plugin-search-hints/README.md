# Kibi search hints plugin

This package provides the `kibi.search-hints.v1` capability. When `kb_search` gives a weak or abstained lexical answer, Kibi asks it which current entities the question is probably about, and shows up to ten of their requirements under `queryAnalysis.hints` and in one sentence of the text answer. The agent then re-asks in the KB's own words. Hints never change search results, the governing answer, abstention, `kb_check` or proofs.

Activate it in the project's `package.json` and install it as a dev dependency:

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
