// OpenCode resolves a local-directory plugin by loading <dir>/tui.js directly,
// without consulting package.json "exports". Re-export the built TUI entry so
// directory installs load the same definition as npm installs of
// kibi-opencode/tui. The default export is an object, not a function: legacy
// loaders invoke every function export.
// implements REQ-opencode-v2-plugin-api
export { default } from "./dist/tui.js";
