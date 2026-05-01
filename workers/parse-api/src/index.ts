import { parseWithFallback } from "./parseFallback";

type ParsePayload = { language?: string; source?: string };

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function normalizeLanguage(input: string): string {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "js") return "javascript";
  if (raw === "ts") return "typescript";
  if (raw === "py") return "python";
  if (raw === "golang") return "go";
  if (raw === "rs") return "rust";
  if (raw === "c++") return "cpp";
  if (raw === "c#" || raw === "cs") return "csharp";
  return raw;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }

    if (request.method === "POST" && url.pathname === "/parse") {
      const body = (await request.json().catch(() => null)) as ParsePayload | null;
      if (!body) return json({ error: "Invalid JSON body." }, 400);
      const language = String(body.language ?? "").trim();
      const source = String(body.source ?? "");
      if (!language) return json({ error: "Missing `language`." }, 400);
      return json(parseWithFallback({ language: normalizeLanguage(language), source }));
    }

    return json({ error: "Not found" }, 404);
  },
};
