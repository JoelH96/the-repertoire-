import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

// Some recipe sites turn away requests that don't look like a browser.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
};

export class FetchPageError extends Error {}

export type Page = { url: string; html: string };

// Fetches a public web page's HTML. Refuses anything that resolves to a private address,
// so users can't make the server probe its own network.
export async function fetchPage(input: string, headers: Record<string, string> = {}): Promise<Page> {
  let url = parseUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { ...HEADERS, ...headers },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new FetchPageError(`Couldn't reach ${url.hostname}`);
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = parseUrl(new URL(location, url).href);
      continue;
    }
    if (!res.ok) {
      throw new FetchPageError(`${url.hostname} wouldn't share the page (error ${res.status})`);
    }
    return { url: url.href, html: await readText(res) };
  }
  throw new FetchPageError("Too many redirects");
}

export function parseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new FetchPageError("That doesn't look like a web address");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchPageError("That doesn't look like a web address");
  }
  return url;
}

async function readText(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new FetchPageError(`Couldn't find ${hostname}`);
  }
  if (addresses.some(isPrivateAddress)) {
    throw new FetchPageError("That address isn't a public web page");
  }
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return a === "::" || a === "::1" || /^f[cd]/.test(a) || /^fe[89ab]/.test(a);
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
