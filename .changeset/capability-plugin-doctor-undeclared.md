---
"kibi-cli": patch
---

`kibi doctor` now fails when a capability plugin is activated in `package.json` but the package is not a declared dependency. Previously the check could report `declared=no` and still pass, even though loading that plugin is rejected.

Add the package to `dependencies`, `devDependencies`, or `optionalDependencies`, or remove the `kibi.plugins` entry. The check still only reads `package.json` and does not import the plugin.

- Fail the Capability plugins doctor check when any configured row has `declared=no`
- Keep the existing row text and add an actionable remediation
