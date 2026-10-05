# kibi-plugin-jev

Optional Kibi capability plugin that uses TypeSafe Jev (`@typesafe-ai/sdk`) for
two capabilities:

- `kibi.semantic-classifier.v1` — lane classification for semantic advisor
  propositions.
- `kibi.vocabulary-alignment.v1` — modeling-time vocabulary convergence:
  choosing an existing subject for a new clause (`rankSubjects`) and flagging
  claims that may restate an existing one (`compareClaims`).

Each capability is activated separately. Activating one never activates the
other.

## Install and activate

```bash
npm install --save-dev kibi-plugin-jev
mkdir -p ~/.config/kibi
printf '%s\n' 'TYPESAFE_API_KEY=...' >> ~/.config/kibi/env
```

Optional project override: put `TYPESAFE_API_KEY=...` in `<workspace>/.env.kibi`.
Process environment variables always win. No Cursor/OpenCode/Codex/ZCode-specific
secret config is required — any harness that starts `kibi` / `kibi-mcp` uses the
same resolution. Restart long-running MCP after changing env files.

Activation is explicit in the project `package.json`. Installing the package
does not activate it, and the API key must not be stored in that file.

```json
{
  "kibi": {
    "plugins": [
      {
        "package": "kibi-plugin-jev",
        "capabilities": {
          "kibi.semantic-classifier.v1": { "mode": "augment" },
          "kibi.vocabulary-alignment.v1": { "mode": "augment" }
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
| `TYPESAFE_API_KEY` | yes, when a call is made | TypeSafe credential. Prefer `~/.config/kibi/env` or `.env.kibi`. Read only when a client is constructed for a real call. |
| `KIBI_JEV_MODEL` | no | Model id. Empty is unset. Default `jev-latest`. |
| `KIBI_JEV_TIMEOUT_MS` | no | Positive integer milliseconds, at most 120000. Malformed values throw `JevProviderError` (`malformed`) before any network call. |

`augment` lets builtin handle normal cases and asks Jev only for what builtin
left unresolved (an unresolved or ambiguous lane; a clause the builtin ranker
left as `new_subject`; a claim pair the builtin did not judge a duplicate).
`replace` gives Jev the capability and uses builtin only after provider failure.
`shadow` runs Jev for comparison and cannot change canonical output.

## Vocabulary alignment

Kibi's builtin ranker always runs first and is complete on its own: it scores
existing subject facts by IDF-weighted token overlap with the clause, the
subject title, and the titles of requirements that already constrain the
subject. Jev refines that result:

- `rankSubjects` asks one `choice` question per clause over the builtin top 5
  candidates plus `new_subject`. Jev can only pick among those candidates; any
  other answer is rejected and Kibi falls back to builtin.
- `compareClaims` asks one `noul` question per claim pair ("do these two claims
  state the same obligation?"). A yes is a review candidate
  (`review:possible-duplicate`), never a verdict.

Vocabulary alignment runs only inside requirement modeling (the
`kb_model_requirement` operation: MCP `kb_model` with `mode: "requirement"`,
CLI `kibi model-requirement`). `kb_check` and
`kibi check` never call it: the Prolog checks (`domain-redundancy`,
`subject-key-identity`, and the others) stay deterministic, offline, and the
only pass/fail authority.

## Behavior and safety

Explicit `JevSemanticClassifierOptions` (`model`, `timeoutMs`, `apiKey`,
`clientFactory`) override the environment for both capabilities. That
constructor (`createJevPlugin`, `createJevSemanticClassifier`,
`createJevVocabularyAlignment`) is for programmatic embedding and tests.
`package.json` does not accept provider options.

Installing the package without activation makes **zero** TypeSafe calls.
Importing the module does not create a client. Kibi does not depend on Jev.
When active, proposition or clause text (and, for subject ranking, candidate
subject keys and requirement titles) is sent to TypeSafe. On provider failure
Kibi falls back to the builtin provider and stamps the result
`fallbackUsed: true`. Diagnostics include the effective model and never the API
key. The host loads the named `kibiPlugin` export. `kibi doctor` reports each
activated capability and mode, secret source labels, and Jev model/timeout
without values.
