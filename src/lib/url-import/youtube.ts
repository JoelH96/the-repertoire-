import "server-only";

import { fetchPage, FetchPageError } from "./fetch-page";

export type YouTubeVideo = { url: string; title: string; channel: string; description: string };

// Handles youtube.com/watch?v=, youtu.be/, /shorts/, /live/ and /embed/ links.
export function youTubeVideoId(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// Reads the full description from the watch page's embedded player data. The meta
// description tag is cut short, which usually loses the ingredients.
export async function fetchYouTubeVideo(id: string): Promise<YouTubeVideo> {
  const url = `https://www.youtube.com/watch?v=${id}`;
  // SOCS skips the cookie consent page YouTube shows to requests from Europe.
  const { html } = await fetchPage(`${url}&hl=en`, { Cookie: "SOCS=CAI" });

  const player = embeddedJson(html, "ytInitialPlayerResponse") as {
    videoDetails?: { title?: string; author?: string; shortDescription?: string };
  } | null;
  const details = player?.videoDetails;
  if (!details) throw new FetchPageError("Couldn't read that YouTube video");

  return {
    url,
    title: details.title ?? "",
    channel: details.author ?? "",
    description: details.shortDescription ?? "",
  };
}

// Pulls the object literal assigned to `name` in an inline script, e.g. `var x = {...};`.
function embeddedJson(html: string, name: string): unknown {
  const start = html.search(new RegExp(`${name}\\s*=\\s*\\{`));
  if (start === -1) return null;
  const open = html.indexOf("{", start);

  let depth = 0;
  let inString = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(open, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Links in the description, e.g. "Full recipe: https://…", minus social and shop links.
export function descriptionLinks(description: string): string[] {
  const skip =
    /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|threads\.net|pinterest\.[a-z.]+|patreon\.com|amazon\.[a-z.]+|amzn\.to|spotify\.com|discord\.gg|linktr\.ee)$/i;
  const links = description.match(/https?:\/\/[^\s<>"')]+/g) ?? [];
  return [...new Set(links)].filter((link) => {
    try {
      return !skip.test(new URL(link).hostname);
    } catch {
      return false;
    }
  });
}
