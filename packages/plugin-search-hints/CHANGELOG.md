# kibi-plugin-search-hints

## 0.1.0

### Minor Changes

- f3150b5: `kb_search` can now suggest which requirements a weakly answered question probably means, found by meaning instead of shared words. Install the optional `kibi-plugin-search-hints` and activate `kibi.search-hints.v1` in `replace` mode under `package.json` `kibi.plugins`. When the intent answer abstains or its top score is below 0.44, `queryAnalysis.hints` lists up to ten current requirements (a hit on a scenario, test or fact is shown as its requirement, under `via`) and the text names the first five. Hints never change the ranked results, the answer layer or abstention, and `hints: false` turns them off. On Kibi's own KB, 20 reworded questions found the right requirement 2 times in the top three; with hints it is shown 14 times.
  - New package `kibi-plugin-search-hints` bundles the MIT-licensed potion-base-8M static embedding (about 7.7 MB, int8) with a pure JavaScript tokenizer checked against the upstream one. It needs no network, native code or download, and caches entity vectors in Kibi's runtime directory, rebuilding only entities whose text changed. It is optional and not part of the default install.
  - `kibi-plugin-sdk` adds the `kibi.search-hints.v1` capability and `validateSearchHintsResult`: a provider may name only the entities it was given, at most 20, scored between 0 and 1 in score then id order. `augment` mode is rejected for it.
  - A provider that throws, times out, returns an invalid result or cannot load gives no hints and a diagnostic; the search still answers.
  - `kb_plan_bootstrap` offers `kibi-plugin-search-hints` once the KB holds 50 or more requirement documents. Plugin offers now carry the `mode` to activate them in. The `kibi-usage` and `kibi-bootstrap` skills cover hints and the offer.

  Migration: none required. Without the plugin, `kb_search` answers exactly as before.
