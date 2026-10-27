---
"kibi-core": patch
---

Set facts keep members that contain a slash. A value such as `${PLUGIN_ROOT}/bin/launcher.cjs` or a URL was cut to its last path segment when Kibi derived a proof obligation or compared set values, so a source proof of a path set was rejected.
