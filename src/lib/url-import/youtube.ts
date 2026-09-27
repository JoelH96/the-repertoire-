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

// YouTube often answers servers in data centres (like Vercel's) with a "confirm you're
// not a bot" page instead of the video, so the official Data API is used when a key is set.
export async function fetchYouTubeVideo(id: string): Promise<YouTubeVideo> {
  const key = process.env.YOUTUBE_API_KEY;
  return key ? fromDataApi(id, key) : fromWatchPage(id);
}

async function fromDataApi(id: string, key: string): Promise<YouTubeVideo> {
  const api = new URL("https://www.googleapis.com/youtube/v3/videos");
  api.search = new URLSearchParams({ part: "snippet", id, key }).toString();
  const res = await fetch(api, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("YouTube Data API error", res.status, body?.error?.message);
    throw new FetchPageError("Couldn't read that YouTube video");
  }
  const snippet = body?.items?.[0]?.snippet;
  if (!snippet) throw new FetchPageError("Couldn't find that YouTube video. Is it private?");
  return {
    url: watchUrl(id),
    title: snippet.title ?? "",
    channel: snippet.channelTitle ?? "",
    description: snippet.description ?? "",
  };
}

// Reads the full description from the watch page's embedded player data. The meta
// description tag is cut short, which usually loses the ingredients.
async function fromWatchPage(id: string): Promise<YouTubeVideo> {
  // SOCS skips the cookie consent page YouTube shows to requests from Europe.
  const { html } = await fetchPage(`${watchUrl(id)}&hl=en`, { Cookie: "SOCS=CAI" });

  const player = embeddedJson(html, "ytInitialPlayerResponse") as {
    playabilityStatus?: { status?: string; reason?: string };
    videoDetails?: { title?: string; author?: string; shortDescription?: string };
  } | null;
  const details = player?.videoDetails;
  if (!details) {
    console.error("YouTube watch page had no video details", player?.playabilityStatus ?? "no player data");
    throw new FetchPageError("YouTube wouldn't share that video with us. Try again later.");
  }

  return {
    url: watchUrl(id),
    title: details.title ?? "",
    channel: details.author ?? "",
    description: details.shortDescription ?? "",
  };
}

function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
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
