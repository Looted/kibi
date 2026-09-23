# Developing Kibi capability plugins

Kibi capability plugins extend three host-owned seams without taking over
validation, Prolog, mutation, or proof:

1. `kibi.semantic-classifier.v1` — lane / ambiguity classification over host
   propositions
2. `kibi.ontology-pack.v1` — predicate schemas and match candidates
3. `kibi.symbol-extractor.v1` — language-specific source symbol analysis

This is distinct from **host plugins** such as `kibi-cursor`, `kibi-opencode`,
`kibi-codex`, and `kibi-zcode`, which adapt an IDE or agent host to Kibi's
operation surface. Capability plugins never register MCP tools or Git hooks.

## Automatic builtin

`kibi-plugin-builtin` ships with the standard CLI distribution and is always
registered. It is **not** listed in `package.json` `kibi.plugins`. With no
`kibi.plugins` config, behavior matches the historical builtin-only tree.

## Named export

Activated packages must export a single named `kibiPlugin` binding that
passes `validateKibiPlugin` / `defineKibiPlugin` from `kibi-plugin-sdk`.
A `default` export alone is not accepted by the host loader.

```ts
import { KIBI_PLUGIN_API_VERSION, defineKibiPlugin } from "kibi-plugin-sdk";

export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "example-ontology",
  version: "0.1.0",
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: {
    ontologyPack: {
      id: "example-ontology.pack",
      schemas: () => [],
      match: () => [],
    },
  },
});
```

Third-party plugins need only `kibi-plugin-sdk`. They must not depend on
`kibi-cli` or `kibi-mcp` internals.

## Activation

Declare the package as a project dependency and activate capabilities under
`package.json`:

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

Rules:

- Bare package names only (no paths, URLs, or aliases)
- Package must appear in `dependencies`, `devDependencies`, or
  `optionalDependencies`
- Resolution follows the project's package manager (npm, pnpm symlink, Yarn PnP)
- `NODE_PATH`, global installs, and ambient ancestor packages are rejected

## Configuration surface (v1)

`package.json#kibi.plugins` is the canonical activation and mode surface. Each entry names a bare package and the capabilities it may provide, with `augment`, `replace`, or `shadow`. That manifest is small, declarative, and validated before any plugin module is imported. Provider secrets stay in the environment, outside repository configuration.

v1 does not add `kibi.config.ts`, generic plugin options, plugin factories, or arbitrary executable config. A later version may add a typed config file if capability-specific settings outgrow this manifest. This note does not choose that future shape.

`kibi doctor` prints the parsed plugin rows (package, capability, mode, declared dependency) without importing the plugin package. First-party Jev secret/model diagnostics are known statically; generic plugins do not get secret introspection until a future static manifest contract exists. A configured package that is not listed in `dependencies`, `devDependencies`, or `optionalDependencies` fails that check. Add the package to one of those fields, or remove the `kibi.plugins` entry. Editing `package.json` remains the way to enable or disable a plugin.

## Modes

Per capability, at most one `replace` is allowed. `augment` providers run in
package activation order with capability-specific builtin positioning.
`shadow` providers never affect canonical results; they may contribute
comparison metadata only.

| Capability | Builtin position | Notes |
| --- | --- | --- |
| Semantic classifier | First for `augment`; fallback for `replace` failure | External classifiers run only from `kb_semantic_advisor` and `kb_compile_intent`. Valid empty `decisions[]` under `replace` is abstention (conservative `none`), not builtin fill. |
| Ontology pack | Catalog starts with builtin for `augment` | `replace` excludes the builtin provider catalog. Valid empty `match()` is abstention (no builtin consult). Allowed wherever Kibi already matches ontology |
| Symbol extractor | Builtin first for supported files under `augment` | `replace` gets first claim with builtin fallback |

Sync maintenance paths (`sync`, `check`, `kb_upsert`, `status`, proof, and
related) keep deterministic builtin analysis for all three capabilities and must
never invoke external semantic classifiers, ontology packs, or symbol
extractors. Async advisor / compile-intent / staged-symbol paths compose the
registry (replace / augment / shadow); replace mode strips or overrides any
sync-path builtin suggestions before results are returned.

## Trust boundary

Explicit activation grants **code-execution trust** to the npm package. Module
evaluation can run arbitrary top-level code. Kibi cannot enforce a third-party
`network: false` declaration after import.

`permissions.network`, `permissions.metered`, and `permissions.secrets` are
**disclosure-only metadata** for operators and UIs, not an in-process sandbox.

Plugins cannot bypass completeness checks, Prolog, mutation gates, or proof.
Host validators stamp provider provenance (`pluginId`, mode, external,
network/metered, fallback).

## Privacy and cost

Semantic classifiers may receive claim keys, proposition text, and minimal role
or signal context. Prefer local/offline providers when possible. Metered
providers must declare `metered: true` and list required secret names.

## Testing

- Unit-test classifiers/packs/extractors against `kibi-plugin-sdk` validators
- Keep import side effects free of network I/O until an allowed capability call
- For optional providers such as Jev, cover missing key, timeout, and malformed
  responses with injectable clients and offline fixtures

## Optional Jev classifier

`kibi-plugin-jev` implements only `kibi.semantic-classifier.v1` via TypeSafe
Jev (`@typesafe-ai/sdk`). It is **not** a default CLI or MCP dependency.

- Install and activate explicitly (see [install.md](./install.md))
- Set `TYPESAFE_API_KEY` via Kibi env bootstrap (same for every MCP host):

```bash
mkdir -p ~/.config/kibi
printf '%s\n' 'TYPESAFE_API_KEY=...' >> ~/.config/kibi/env
```

  Optional project override: `<workspace>/.env.kibi`. Process env wins;
  `KIBI_ENV_FILE` replaces the project path; legacy `.env` fills gaps only.
  Never store the key in `package.json`. Restart long-running MCP after changes.
- Optional `KIBI_JEV_MODEL` (default `jev-latest`; empty or whitespace is unset)
- Optional `KIBI_JEV_TIMEOUT_MS`, a positive integer of at most 120000. Malformed values fail with a provider diagnostic that includes the effective model and not the API key
- Explicit `JevSemanticClassifierOptions.model` and `timeoutMs` override those environment defaults. They are a programmatic constructor API, not fields in `package.json`
- Importing the package, or leaving it installed but inactive, performs no TypeSafe client or network call
- On failure Kibi falls back to the builtin classifier with an advisory warning
- `kb_model_requirement` does not invoke this classifier. External semantic classifiers run only from `kb_semantic_advisor` and `kb_compile_intent`
- Live tests require both `KIBI_JEV_LIVE_TEST=1` and `TYPESAFE_API_KEY`
- `kibi doctor` reports first-party Jev secret source labels and model/timeout without importing the plugin or leaking values

See also [packages/plugin-jev/README.md](../packages/plugin-jev/README.md).
