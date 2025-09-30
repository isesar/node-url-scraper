export interface FetchResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
}

export async function fetchOnce(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
