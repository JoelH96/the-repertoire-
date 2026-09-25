import type { ExtractedRecipe } from "@/lib/recipe-schema";
import { decodeEntities, htmlToText, metaContent } from "./html";

type Json = unknown;
type Node = Record<string, Json>;

// Reads the schema.org Recipe that most recipe sites (BBC Good Food, blogs on WordPress
// recipe plugins, etc.) embed as JSON-LD. Returns null if the page has none.
export function recipeFromJsonLd(html: string, pageUrl: string): ExtractedRecipe | null {
  const recipe = findRecipe(readJsonLd(html));
  if (!recipe) return null;

  return {
    title: text(recipe.name) || text(recipe.headline),
    description: text(recipe.description),
    servings: servings(recipe.recipeYield),
    total_time: duration(recipe.totalTime) || sumDurations(recipe.prepTime, recipe.cookTime),
    ingredients: list(recipe.recipeIngredient ?? recipe.ingredients).map(text).filter(Boolean),
    steps: steps(recipe.recipeInstructions),
    source: credit(recipe, html, pageUrl),
  };
}

function readJsonLd(html: string): Json[] {
  const blocks: Json[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, body] of html.matchAll(re)) {
    const cleaned = body
      .trim()
      .replace(/^<!\[CDATA\[|\]\]>$/g, "")
      .replace(/^<!--|-->$/g, "");
    try {
      blocks.push(JSON.parse(cleaned));
    } catch {
      // Some sites ship raw newlines inside strings; JSON.parse rejects those.
      try {
        blocks.push(JSON.parse(cleaned.replace(/[\n\r\t]+/g, " ")));
      } catch {}
    }
  }
  return blocks;
}

// Recipes can sit at the top level, in an array, in @graph, or under mainEntity.
function findRecipe(value: Json, depth = 0): Node | null {
  if (depth > 6 || !value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const node = value as Node;
  if (list(node["@type"]).some((t) => t === "Recipe" || t === "schema:Recipe")) return node;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "hasPart", "itemListElement", "item"]) {
    const found = findRecipe(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function list(value: Json): Json[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: Json): string {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return htmlToText(decodeEntities(value)).replace(/\s+/g, " ").trim();
}

// Instructions come as one string, a list of strings, HowToSteps, or HowToSections of steps.
// Section names become their own line, as with subheadings on a cookbook page.
function steps(value: Json): string[] {
  const out: string[] = [];
  for (const item of list(value)) {
    if (typeof item === "string") {
      out.push(...splitLines(item));
    } else if (item && typeof item === "object") {
      const node = item as Node;
      if (list(node["@type"]).includes("HowToSection")) {
        const name = text(node.name);
        if (name) out.push(name);
        out.push(...steps(node.itemListElement));
      } else if (node.itemListElement) {
        out.push(...steps(node.itemListElement));
      } else {
        const step = text(node.text) || text(node.name) || text(node.description);
        if (step) out.push(step);
      }
    }
  }
  return out;
}

function splitLines(value: string): string[] {
  const withBreaks = decodeEntities(value).replace(/<(br|\/p|\/li)\b[^>]*>/gi, "\n");
  return htmlToText(withBreaks)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").replace(/^\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}

// recipeYield is often ["4", "4 servings"] or just 4. Prefer the most descriptive form.
function servings(value: Json): string {
  const options = list(value).map(text).filter(Boolean);
  const worded = options.find((s) => /[a-z]/i.test(s));
  if (worded) return worded;
  return options[0] ? `Serves ${options[0]}` : "";
}

// ISO 8601 durations, e.g. PT1H20M -> "1 hr 20 min".
function parseDuration(value: Json): number | null {
  const match = typeof value === "string" && value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?)?$/i);
  if (!match) return null;
  const [, d, h, m] = match;
  return (Number(d ?? 0) * 24 + Number(h ?? 0)) * 60 + Number(m ?? 0);
}

function formatMinutes(total: number): string {
  if (total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(" ");
}

function duration(value: Json): string {
  const minutes = parseDuration(value);
  if (minutes !== null) return formatMinutes(minutes);
  return typeof value === "string" && !value.startsWith("P") ? text(value) : "";
}

function sumDurations(...values: Json[]): string {
  const minutes = values.map(parseDuration).filter((m): m is number => m !== null);
  return minutes.length ? formatMinutes(minutes.reduce((a, b) => a + b, 0)) : "";
}

function name(value: Json): string {
  return list(value)
    .map((v) => (v && typeof v === "object" ? text((v as Node).name) : text(v)))
    .filter(Boolean)
    .join(" & ");
}

// "Author, Site", e.g. "Esther Clark, BBC Good Food". Falls back to the site's domain.
function credit(recipe: Node, html: string, pageUrl: string): string {
  const author = name(recipe.author);
  const site =
    name(recipe.publisher) ||
    metaContent(html, "og:site_name") ||
    new URL(pageUrl).hostname.replace(/^www\./, "");
  if (!author || author.toLowerCase() === site.toLowerCase()) return site;
  return `${author}, ${site}`;
}
