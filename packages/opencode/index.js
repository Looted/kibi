// OpenCode resolves a local-directory plugin (for example a distro package in
// /usr/lib/opencode/plugins/kibi-opencode) by loading <dir>/index.js directly,
// without consulting package.json "exports". Re-export the built entrypoint so
// directory installs load the same plugin definition as npm installs.
export { default } from "./dist/index.js";
