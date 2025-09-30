export interface NormalizedUrl {
  displayUrl: string;
  requestUrl: string;
  key: string; // used for deduplication (host+path, lowercase, no scheme)
}

const TRAILING_PUNCT = new Set([',', '.', ';', ':', ')', ']', '}', '!', '?', '"', '\'']);

function stripTrailingPunct(input: string): string {
  let s = input.trim();
  while (s.length > 0) {
    const last = s.charAt(s.length - 1);
    if (!TRAILING_PUNCT.has(last)) break;
    s = s.slice(0, -1);
  }
  return s;
}

function removeScheme(u: URL): string {
  const host = u.host.toLowerCase();
  const path = `${u.pathname || ''}${u.search || ''}${u.hash || ''}`;
  return host + (path === '/' ? '' : path);
}

export function normalize(rawToken: string): NormalizedUrl {
  const trimmed = stripTrailingPunct(rawToken);

  // If token already has http/https scheme, preserve it for request
  const hasScheme = /^(https?:)\/\//i.test(trimmed);

  try {
    const requestUrl = hasScheme ? trimmed : `https://${trimmed}`;
    const u = new URL(requestUrl);
    u.hostname = u.hostname.toLowerCase();

    const displayUrl = removeScheme(u);
    // Dedupe key: lowercase host + path/search/hash, no scheme
    const key = displayUrl.toLowerCase();

    return {
      displayUrl,
      requestUrl: u.toString(),
      key,
    };
  } catch {
    // If URL constructor fails, fall back to a conservative form
    const displayUrl = trimmed;
    return {
      displayUrl,
      requestUrl: `https://${trimmed}`,
      key: displayUrl.toLowerCase(),
    };
  }
}

