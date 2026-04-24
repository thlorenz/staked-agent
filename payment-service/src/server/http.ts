export function jsonOk<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

export function jsonError(
  status: number,
  error: string,
  details?: string,
): Response {
  return new Response(JSON.stringify({ ok: false, error, details }), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
