import { createRequire } from "node:module";
import {
  type CheckPolicyDocument,
  KIBI_PLUGIN_API_VERSION,
  defineKibiPlugin,
  validateCheckPolicyDocument,
} from "kibi-plugin-sdk";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

/**
 * The UI design check policy this package ships. Kibi reads the same
 * `check-policy.json` as data during `kb_check`; this export exists for tools
 * and tests that want the document without reading the file.
 */
// implements REQ-ui-plugin-design-policy
export const UI_CHECK_POLICY: CheckPolicyDocument = validateCheckPolicyDocument(
  require("../check-policy.json"),
);

/**
 * Named plugin export required by the Kibi host loader. The plugin declares no
 * permissions: it only contributes a check policy document.
 */
// implements REQ-ui-plugin-design-policy
export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "kibi-plugin-ui",
  version: packageJson.version,
  permissions: {
    network: false,
    metered: false,
    secrets: [],
  },
  capabilities: {
    checkPolicy: {
      id: "kibi-plugin-ui.check-policy",
      document: UI_CHECK_POLICY,
    },
  },
});

// implements REQ-ui-plugin-design-policy
export default kibiPlugin;
