import {
  SEMANTIC_LANES,
  type SemanticClassificationDecision,
  type SemanticClassifierInput,
  type SemanticClassifierResult,
  type SemanticClassifierV1,
  type SemanticLane,
} from "kibi-plugin-sdk";
import { choice, noul } from "./typesafe-client.js";
import {
  type JevClient,
  type JevClientFactory,
  type JevChoiceAnswer,
  type JevNoulAnswer,
  JevProviderError,
  mapJevError,
} from "./jev-client.js";
import { createTypeSafeJevClient } from "./typesafe-client.js";

const LANE_CRITERIA = {
  strict_property:
    "Scalar, threshold, cardinality, retention, or numeric bound that should become a strict property fact",
  predicate:
    "Relational, permission, conditional, ownership, or behavioral claim that should become a predicate",
  rule: "Conditional policy best captured as a typed kibi.logic.v1 rule",
  observation_review:
    "Normative prose that needs human/ontology review before grounding",
  none: "Not a machine-checkable modeling obligation",
} as const satisfies Record<SemanticLane, string>;

// implements REQ-capability-plugin-jev-fallback-v1
export type JevSemanticClassifierOptions = Readonly<{
  clientFactory?: JevClientFactory;
  apiKey?: string;
  timeoutMs?: number;
}>;

function isLane(value: string): value is SemanticLane {
  return (SEMANTIC_LANES as readonly string[]).includes(value);
}

function asChoice(answer: unknown): JevChoiceAnswer {
  if (
    typeof answer !== "object" ||
    answer === null ||
    !("choice" in answer) ||
    typeof (answer as { choice?: unknown }).choice !== "string"
  ) {
    throw new JevProviderError(
      "malformed",
      "Jev Choice answer is missing a string choice field",
    );
  }
  return answer as JevChoiceAnswer;
}

function asNoul(answer: unknown): JevNoulAnswer {
  if (
    typeof answer !== "object" ||
    answer === null ||
    !("noul" in answer) ||
    typeof (answer as { noul?: unknown }).noul !== "number"
  ) {
    throw new JevProviderError(
      "malformed",
      "Jev Noul answer is missing a numeric noul field",
    );
  }
  return answer as JevNoulAnswer;
}

function confidenceFromChoice(answer: JevChoiceAnswer): number {
  if (
    typeof answer.confidence === "number" &&
    Number.isFinite(answer.confidence)
  ) {
    return Math.max(0, Math.min(1, answer.confidence));
  }
  const selected = answer.probabilities?.[answer.choice];
  if (typeof selected === "number" && Number.isFinite(selected)) {
    return Math.max(0, Math.min(1, selected));
  }
  return 0.5;
}

// implements REQ-capability-plugin-jev-fallback-v1
export function createJevSemanticClassifier(
  options: JevSemanticClassifierOptions = {},
): SemanticClassifierV1 {
  let client: JevClient | undefined;
  const factory = options.clientFactory ?? createTypeSafeJevClient;

  const ensureClient = (): JevClient => {
    client ??= factory({
      ...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
      ...(options.timeoutMs !== undefined
        ? { timeoutMs: options.timeoutMs }
        : {}),
    });
    return client;
  };

  return {
    id: "jev-semantic-classifier",
    async classify(
      input: SemanticClassifierInput,
    ): Promise<SemanticClassifierResult> {
      if (input.propositions.length === 0) {
        return { decisions: [] };
      }

      try {
        const questions: Record<string, unknown> = {};
        for (const proposition of input.propositions) {
          questions[`lane:${proposition.claimKey}`] = choice(
            `Select the Kibi modeling lane for this proposition.`,
            LANE_CRITERIA,
          );
          questions[`ambiguous:${proposition.claimKey}`] = noul(
            "Is this proposition materially ambiguous between multiple modeling lanes?",
          );
        }

        const response = await ensureClient().systemOne({
          model: "jev-latest",
          state: {
            propositions: input.propositions.map((proposition) => ({
              claimKey: proposition.claimKey,
              statement: proposition.statement,
              role: proposition.role ?? null,
              normative: proposition.normative ?? null,
              signals: proposition.signals ?? [],
            })),
            laneDefinitions: LANE_CRITERIA,
          },
          questions,
        });

        const decisions: SemanticClassificationDecision[] =
          input.propositions.map((proposition) => {
            const laneAnswer = asChoice(
              response.answers[`lane:${proposition.claimKey}`],
            );
            if (!isLane(laneAnswer.choice)) {
              throw new JevProviderError(
                "malformed",
                `Jev returned unsupported lane '${laneAnswer.choice}'`,
              );
            }
            const ambiguousAnswer = asNoul(
              response.answers[`ambiguous:${proposition.claimKey}`],
            );
            const confidence = confidenceFromChoice(laneAnswer);
            return {
              claimKey: proposition.claimKey,
              lane: laneAnswer.choice,
              confidence,
              ambiguity: {
                ambiguous: ambiguousAnswer.noul >= 0.5,
                confidence: Math.max(0, Math.min(1, ambiguousAnswer.noul)),
              },
              ...(proposition.signals
                ? {
                    signals: proposition.signals.map((signal) => signal.kind),
                  }
                : {}),
            };
          });

        return { decisions };
      } catch (error) {
        throw mapJevError(error);
      }
    },
  };
}
