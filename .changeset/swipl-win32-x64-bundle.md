---
"kibi-swipl": minor
"kibi-cli": minor
---

Native Windows x64 now gets a bundled SWI-Prolog 10.0.2 (`kibi-swipl-win32-x64`), so `npm install kibi-cli kibi-mcp` on a Windows x64 machine with no SWI-Prolog installed works out of the box and `resolveSwipl()` reports the bundled runtime. The payload is repackaged from the official upstream installer pinned by SHA-256 in `scripts/swipl-version.json` and audited on a clean Windows runner (PE machine check, DLL import closure, relocated smoke test); as on Linux and macOS, the verified bundle is used ahead of a `swipl` on `PATH`, so a Windows machine that already has SWI-Prolog installed switches to the bundled 10.0.2 unless `KIBI_SWIPL` names an executable or `KIBI_SWIPL=system` selects the one on `PATH`. Windows arm64, Alpine/musl and other unsupported platforms keep the previous behavior and need a manual SWI-Prolog 9.0+ install.
