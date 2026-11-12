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
  type JevClient,
  JevProviderError,
  asChoice,
  asNoul,
  choiceConfidence,
  clamp01,
  mapJevError,
} from "./jev-client.js";
import {
  type JevSemanticClassifierOptions,
  resolveJevModel,
  resolveJevTimeoutMs,
} from "./semantic-classifier.js";
import { choice, createTypeSafeJevClient, noul } from "./typesafe-client.js";

/** Candidates offered to Jev per clause, in builtin rank order. */
export const JEV_SUBJECT_TOP_K = 5;

export type JevVocabularyAlignmentOptions = JevSemanticClassifierOptions;

/**
 * TypeSafe Jev vocabulary alignment. `rankSubjects` asks one `choice` question
 * per clause over the builtin top-k subjects plus `new_subject`;
 * `compareClaims` asks one `noul` question per claim pair. Importing or
 * constructing this provider never creates a client or touches the network;
 * the client is created on the first call.
 */
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
            confidence: Math.max(same, 1 - same),
          };
        });
        return { judgments };
      } catch (error) {
        throw withModel(error);
      }
    },
  };
}
