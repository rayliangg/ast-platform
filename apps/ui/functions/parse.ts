import { parseWithFallback } from "../../../scripts/parse-fallback.mjs";

type ParsePayload = {
  language?: string;
  source?: string;
};

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      ...(init?.headers ?? {}),
    },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  let payload: ParsePayload;
  try {
    payload = (await request.json()) as ParsePayload;
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const language = String(payload.language ?? "").trim();
  const source = String(payload.source ?? "");
  if (!language) return json({ error: "Missing `language`." }, { status: 400 });

  try {
    const ast = parseWithFallback({ language, source });
    return json(ast, { status: 200 });
  } catch (e) {
    return json({ error: `Parse failed: ${String(e)}` }, { status: 500 });
  }
}
