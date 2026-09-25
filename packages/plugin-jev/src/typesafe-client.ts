import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import {
  type JevClient,
  type JevClientFactory,
  JevProviderError,
  type JevSystemOneResult,
  mapJevError,
} from "./jev-client.js";

/**
 * Create a real TypeSafe client. Call only when classification is invoked.
 */
// implements REQ-capability-plugin-jev-fallback-v1
export const createTypeSafeJevClient: JevClientFactory = (options = {}) => {
  const apiKey = options.apiKey ?? process.env.TYPESAFE_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new JevProviderError(
      "missing_api_key",
      "TYPESAFE_API_KEY is required to use kibi-plugin-jev",
    );
  }

  const client = new TypeSafeClient({
    apiKey,
    ...(options.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
  });

  return {
    async systemOne(request): Promise<JevSystemOneResult> {
      try {
        const result = await client.systemOne({
          ...(request.model !== undefined ? { model: request.model } : {}),
          // Host-owned proposition context is opaque JSON for Jev.
          state: request.state as never,
          questions: request.questions as never,
        });
        return {
          answers: result.answers as JevSystemOneResult["answers"],
        };
      } catch (error) {
        throw mapJevError(error);
      }
    },
  };
};

export { choice, noul };
