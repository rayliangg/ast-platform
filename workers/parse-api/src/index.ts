type Position = { row: number; column: number };
type Range = { start: Position; end: Position };
type AstNode = {
  id: string;
  language: string;
  node_type: string;
  kind: string;
  name: string | null;
  docstring: string | null;
  range: Range;
  children: AstNode[];
};

type ParsePayload = { language?: string; source?: string };

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function makeId(prefix: string, idx: number): string {
  return `${prefix}-${idx + 1}`;
}

function fullSourceRange(source: string): Range {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const row = Math.max(1, lines.length);
  const column = Math.max(1, (lines[lines.length - 1] ?? "").length + 1);
  return { start: { row: 1, column: 1 }, end: { row, column } };
}

function parsePythonNodes(source: string): AstNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: AstNode[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const classMatch = line.match(/^\s*class\s+([A-Za-z_]\w*)/);
    if (classMatch) {
      nodes.push({
        id: makeId("class", nodes.length),
        language: "python",
        node_type: "class",
        kind: "ClassDef",
        name: classMatch[1] ?? null,
        docstring: null,
        range: { start: { row: i + 1, column: 1 }, end: { row: i + 1, column: line.length + 1 } },
        children: [],
      });
      continue;
    }
    const fnMatch = line.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/);
    if (fnMatch) {
      nodes.push({
        id: makeId("function", nodes.length),
        language: "python",
        node_type: "function",
        kind: "FunctionDef",
        name: fnMatch[1] ?? null,
        docstring: null,
        range: { start: { row: i + 1, column: 1 }, end: { row: i + 1, column: line.length + 1 } },
        children: [],
      });
    }
  }
  return nodes;
}

function parseWithFallback(language: string, source: string): AstNode {
  const lang = language.trim().toLowerCase();
  const children = lang === "python" ? parsePythonNodes(source) : [];
  return {
    id: "root-1",
    language: lang || "text",
    node_type: "file",
    kind: "File",
    name: null,
    docstring: null,
    range: fullSourceRange(source),
    children,
  };
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
      return json(parseWithFallback(language, source));
    }

    return json({ error: "Not found" }, 404);
  },
};
