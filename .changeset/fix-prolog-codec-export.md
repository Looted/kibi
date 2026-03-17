---
'kibi-cli': patch
---

Add missing `./prolog/codec` export to package.json

The MCP package imports `escapeAtom` and `toPrologAtom` from `kibi-cli/prolog/codec`,
but this subpath was not exported in the package.json. This caused the MCP server
to crash on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` when the package was
installed from npm.
