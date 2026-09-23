import { z } from "zod";

// What photo extraction returns. Mirrors the editable fields on `recipes`.
export const ExtractedRecipe = z.object({
  title: z.string().describe("Recipe name as printed"),
  description: z
    .string()
    .describe("Short intro or headnote from the page, or empty string if none"),
  servings: z.string().describe('As printed, e.g. "Serves 4" or "Makes 12"; empty if not shown'),
  total_time: z.string().describe('As printed, e.g. "1 hr 20 min"; empty if not shown'),
  ingredients: z
    .array(z.string())
    .describe("One ingredient per line, exactly as printed, including quantity and any notes"),
  steps: z.array(z.string()).describe("One method step per entry, in order, without step numbers"),
});

export type ExtractedRecipe = z.infer<typeof ExtractedRecipe>;
