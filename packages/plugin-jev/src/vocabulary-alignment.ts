import {
  type ClaimComparisonJudgment,
  type CompareClaimsInput,
  type CompareClaimsResult,
  NEW_SUBJECT_CHOICE,
  type RankSubjectsInput,
  type RankSubjectsResult,
  type SubjectRankingDecision,
  type VocabularyAlignmentV1,
} from "kibi-plugin-sdk";
import {
  type JevChoiceAnswer,
  type JevClient,
  type JevNoulAnswer,
  JevProviderError,
  mapJevError,
} from "./jev-client.js";
import {
  type JevSemanticClassifierOptions,
  resolveJevModel,
  resolveJevTimeoutMs,
} from "./semantic-classifier.js";
import { choice, createTypeSafeJevClient, noul } from "./typesafe-client.js";

/** Candidates offered to Jev per clause, in builtin rank order. */
// implements REQ-kibi-vocabulary-alignment-capability
export const JEV_SUBJECT_TOP_K = 5;

// implements REQ-kibi-vocabulary-alignment-capability
export type JevVocabularyAlignmentOptions = JevSemanticClassifierOptions;

function asChoice(answer: unknown): JevChoiceAnswer {
  if (
    typeof answer !== "object" ||
    answer === null ||
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
    typeof (answer as { noul?: unknown }).noul !== "number"
  ) {
    throw new JevProviderError(
      "malformed",
      "Jev Noul answer is missing a numeric noul field",
    );
  }
  return answer as JevNoulAnswer;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function choiceConfidence(answer: JevChoiceAnswer): number {
  if (typeof answer.confidence === "number") return clamp01(answer.confidence);
  const selected = answer.probabilities?.[answer.choice];
  return typeof selected === "number" ? clamp01(selected) : 0.5;
}

/**
 * TypeSafe Jev vocabulary alignment. `rankSubjects` asks one `choice` question
 * per clause over the builtin top-k subjects plus `new_subject`;
 * `compareClaims` asks one `noul` question per claim pair. Importing or
 * constructing this provider never creates a client or touches the network;
 * the client is created on the first call.
 */
// implements REQ-kibi-vocabulary-alignment-capability
export function createJevVocabularyAlignment(
  options: JevVocabularyAlignmentOptions = {},
): VocabularyAlignmentV1 {
  let client: JevClient | undefined;
  const factory = options.clientFactory ?? createTypeSafeJevClient;
  const model = resolveJevModel(options.model);
  const timeoutMs = resolveJevTimeoutMs(options.timeoutMs);

  const ensureClient = (): JevClient => {
    client ??= factory({
      ...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    });
    return client;
  };

  const withModel = (error: unknown): JevProviderError => {
    const mapped = mapJevError(error);
    return new JevProviderError(mapped.code, mapped.message, {
      cause: mapped,
      model,
    });
  };

  return {
    id: "jev-vocabulary-alignment",
    model,
    async rankSubjects(input: RankSubjectsInput): Promise<RankSubjectsResult> {
      if (input.clauses.length === 0) return { decisions: [] };
      try {
        const questions: Record<string, unknown> = {};
        for (const clause of input.clauses) {
          const criteria: Record<string, string> = {};
          for (const candidate of clause.candidates.slice(
            0,
            JEV_SUBJECT_TOP_K,
          )) {
            criteria[candidate.subjectKey] = [
              candidate.title ?? candidate.subjectKey,
              ...(candidate.requirementTitles ?? []).slice(0, 3),
            ].join(" | ");
          }
          criteria[NEW_SUBJECT_CHOICE] =
            "None of the existing subjects is what this clause governs; declare a new subject";
          questions[`subject:${clause.claimKey}`] = choice(
            "Which existing subject does this requirement clause govern?",
            criteria,
          );
        }
        const response = await ensureClient().systemOne({
          model,
          state: {
            clauses: input.clauses.map((clause) => ({
              claimKey: clause.claimKey,
              text: clause.text,
              proposedSubjectKey: clause.proposedSubjectKey ?? null,
            })),
          },
          questions,
        });
        const decisions: SubjectRankingDecision[] = input.clauses.map(
          (clause) => {
            const answer = asChoice(
              response.answers[`subject:${clause.claimKey}`],
            );
            return {
              claimKey: clause.claimKey,
              choice: answer.choice,
              confidence: choiceConfidence(answer),
            };
          },
        );
        return { decisions };
      } catch (error) {
        throw withModel(error);
      }
    },
    async compareClaims(
      input: CompareClaimsInput,
    ): Promise<CompareClaimsResult> {
      if (input.pairs.length === 0) return { judgments: [] };
      try {
        const questions: Record<string, unknown> = {};
        for (const pair of input.pairs) {
          questions[`same:${pair.pairKey}`] = noul(
            "Do these two requirement claims state the same obligation, so one is a paraphrase of the other?",
          );
        }
        const response = await ensureClient().systemOne({
          model,
          state: {
            pairs: input.pairs.map((pair) => ({
              pairKey: pair.pairKey,
              sharedKey: pair.sharedKey,
              left: pair.left.claimText,
              right: pair.right.claimText,
            })),
          },
          questions,
        });
        const judgments: ClaimComparisonJudgment[] = input.pairs.map((pair) => {
          const same = clamp01(
            asNoul(response.answers[`same:${pair.pairKey}`]).noul,
          );
          return {
            pairKey: pair.pairKey,
            sameObligation: same >= 0.5,
            confidence: same >= 0.5 ? same : 1 - same,
          };
        });
        return { judgments };
      } catch (error) {
        throw withModel(error);
      }
    },
  };
}
