---
"kibi-cli": patch
"kibi-runtime": patch
---

`kb_upsert` on an existing Markdown entity no longer reformats front matter it did not change. Before, any update re-serialized the whole block: unquoted timestamps gained `.000Z`, quoting changed, flow lists such as `tags: [a, b]` became block lists and `links` were re-indented, so a one-field update produced a noisy diff. Now only keys whose value changes are rewritten (new keys are appended), and every other line keeps its authored bytes.

Technical summary: `renderEntityDocument` in `source-authoring.ts` splits the existing document with `frontmatterBlock`, computes the keys the upsert sets (`entityFrontmatterUpdates`, unchanged rules: no runtime timestamps, `source` or relationship keys; `type` and a derived `semantic_text` are still written), and `patchFrontmatter` splices each changed key over its source range from a `yaml` `parseDocument` (a value equal under either the YAML 1.2 core or the js-yaml reading counts as unchanged; a changed flow collection stays in flow style). A front matter block that is not a plain block mapping, or has parse errors such as duplicate keys, falls back to the previous full render. New documents render as before.
