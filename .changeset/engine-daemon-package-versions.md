---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

An engine daemon left running by another Kibi install, for example one an older `kibi` started from a git hook, no longer serves a newer client. The client now compares the daemon's package versions on connect and stops and replaces a daemon that differs, the same way it already does for a different SWI-Prolog. `kibi doctor` reports the package versions of the running daemon.

Technical summary: the built version string (`kibi-cli@…,kibi-core@…`, shared from the new `package-versions.ts`; `KIBI_PACKAGE_VERSIONS` still overrides it) is sent by the client on every request and passed to the daemon it spawns. The daemon reports its versions in the `handshake` reply and refuses every other request except `stop` from a client with other versions; `reconcileRuntime` replaces a daemon whose handshake reports other versions (or none, as a pre-change daemon does) and fails with a clear error if the replacement still differs. kibi-runtime bakes the bundled kibi-cli version into its bundles at build time, so a runtime-hosted client and a kibi-cli daemon of the same release agree. `EngineClient.inspectLiveDaemon()` reads a live daemon's handshake without starting one, and `kibi doctor` uses it for the new "Engine daemon" check.
