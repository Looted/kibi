// Prints the `bun build --define` argument that bakes the bundled kibi-cli
// version into the engine, so a bundled engine reports the same package
// versions as the kibi-cli release it was built from.
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../../cli/package.json", import.meta.url), "utf8"),
);
process.stdout.write(
  `__KIBI_CLI_VERSION__=${JSON.stringify(manifest.version)}`,
);
