import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Sonnet 5 misread small print on real cookbook pages.
export const MODEL = "claude-opus-5";

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Sends content to Claude and returns output matching `schema`, or throws ExtractionError.
export async function extract<T extends z.ZodType>(
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: T,
): Promise<z.infer<T>> {
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier wrongly declines, the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(schema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new ExtractionError("Couldn't read a recipe", 422);
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractionError("Extraction is busy, try again shortly", 503);
    }
    if (err instanceof Anthropic.APIError) {
      throw new ExtractionError(`Extraction failed: ${err.message}`, 502);
    }
    throw err;
  }
}
