import { describe } from "bun:test";
import * as inference from "../../../src/operations/modeling/predicate-inference-1.js";
import { pinSentenceRows } from "./golden-rows.js";

describe("predicate-inference-1 argument inference", () => {
  pinSentenceRows(inference, "predicate-inference-1.golden.json");
});
