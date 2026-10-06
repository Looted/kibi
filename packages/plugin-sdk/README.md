# kibi-plugin-sdk

Public protocol types and validators for writing [Kibi](https://looted.github.io/kibi/) capability plugins. A capability plugin can provide a semantic classifier, an ontology pack, a symbol extractor or vocabulary alignment; the host keeps validation, Prolog, mutation and proof.

```bash
npm install kibi-plugin-sdk
```

```ts
import { KIBI_PLUGIN_API_VERSION, defineKibiPlugin } from "kibi-plugin-sdk";

export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "example-ontology",
  version: "0.1.0",
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: {
    // declare only the capabilities you provide
    ontologyPack: {
      id: "example-ontology.pack",
      schemas: () => [],
      match: () => [],
    },
  },
});
```

A plugin package must export a named `kibiPlugin` binding; a default export alone is not loaded. Projects enable it by listing the package under `kibi.plugins` in `package.json`. The [plugin development guide](https://looted.github.io/kibi/reference/plugins.html) covers every capability, versioning and activation.

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
