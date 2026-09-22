# kibi-plugin-jev

Optional Kibi capability plugin that uses TypeSafe Jev (`@typesafe-ai/sdk`) for
`kibi.semantic-classifier.v1` only.

## Install and activate

```bash
npm install --save-dev kibi-plugin-jev
export TYPESAFE_API_KEY=...
```

Activation is explicit in the project `package.json`. Installing the package
does not activate it, and the API key must not be stored in that file.

```json
{
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

Restart long-running Kibi MCP or client processes after changing `kibi.plugins`.
Removing that entry disables the plugin.

| Variable | Required | Meaning |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | yes, when a call is made | TypeSafe credential. Read only when a client is constructed for a real classification. |
| `KIBI_JEV_MODEL` | no | Model id. Empty is unset. Default `jev-latest`. |
| `KIBI_JEV_TIMEOUT_MS` | no | Positive integer milliseconds, at most 120000. Malformed values throw `JevProviderError` (`malformed`) before any network call. |

`augment` lets builtin handle normal cases and asks Jev for unresolved or
ambiguous ones. `replace` gives Jev the capability and uses builtin only after
provider failure. `shadow` runs Jev for comparison and cannot change canonical
output.

Explicit `JevSemanticClassifierOptions` (`model`, `timeoutMs`, `apiKey`,
`clientFactory`) override the environment. That constructor is for programmatic
embedding and tests. `package.json` does not accept provider options.

Installing the package without activation makes **zero** TypeSafe calls.
Importing the module does not create a client. Kibi does not depend on Jev.
When active, proposition text is sent to TypeSafe. On provider failure Kibi
falls back to the builtin classifier. Diagnostics include the effective model
and never the API key. The host loads the named `kibiPlugin` export.
