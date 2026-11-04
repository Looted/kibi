import { describe } from "bun:test";
import * as inference from "../../../src/operations/modeling/predicate-inference-3.js";
import { pinSentenceRows } from "./golden-rows.js";

describe("predicate-inference-3 argument inference", () => {
  pinSentenceRows(inference, "predicate-inference-3.golden.json");
});
