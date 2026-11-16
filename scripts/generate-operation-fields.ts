import { writeFileSync } from "node:fs";
import path from "node:path";
import { listSpecs } from "../packages/cli/src/public/operations/catalog.js";
import { operationFieldReference } from "../packages/cli/src/public/operations/field-reference.js";

const target = path.join(
  import.meta.dir,
  "../packages/runtime/src/skills/kibi-usage/resources/operation-fields.md",
);
writeFileSync(target, operationFieldReference(listSpecs()));
