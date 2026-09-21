# kibi-plugin-jev

Optional Kibi capability plugin that uses TypeSafe Jev (`@typesafe-ai/sdk`) for
`kibi.semantic-classifier.v1` only.

## Install and activate

```bash
npm install --save-dev kibi-plugin-jev
export TYPESAFE_API_KEY=...
```

Activation is explicit in the project `package.json`:

```json
{
  "devDependencies": {
    "kibi-plugin-jev": "^0.1.0"
  },
  "kibi": {
    "plugins": [
      {
        "package": "kibi-plugin-jev",
        "capabilities": {
          "kibi.semantic-classifier.v1": { "mode": "augment" }
        }
      }
    ]
  }
}
```

Installing the package without activation makes **zero** TypeSafe calls.
Kibi does not depend on Jev. When active, proposition text is sent to TypeSafe.
On provider failure Kibi falls back to the builtin classifier with an advisory warning.

The classifier calls TypeSafe with model `jev-latest` by default. That id is
provider-version dependent: the same Kibi/plugin version can observe different
model semantics over time. Pass a different model through
`JevSemanticClassifierOptions.model` when TypeSafe exposes a pinned id. Host
diagnostics include the configured model string.
