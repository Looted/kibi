// Registers the shared `vscode` stub before anything else is imported, for
// runs that load the extension sources ahead of the test files (Stryker's
// coverage preload imports every mutated module first). Without it those
// early imports fail to resolve `vscode` and stay failed for the whole run.
import { mock } from "bun:test";
import { getVscodeMockModule } from "./vscode-mock";

mock.module("vscode", () => getVscodeMockModule());
