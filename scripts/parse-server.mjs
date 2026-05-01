import http from "node:http";
import { spawn } from "node:child_process";
import { parseWithFallback } from "./parse-fallback.mjs";
import { normalizeLanguage } from "./language-normalizer.mjs";

const PORT = 8787;
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function parseWithRust(payload) {
  return new Promise((resolve, reject) => {
    const cmd = spawn("zsh", ["-lc", '. "$HOME/.cargo/env" && cargo run --quiet -p engine'], {
      cwd: new URL("..", import.meta.url).pathname,
    });
    let stdout = "";
    let stderr = "";
    cmd.stdout.on("data", (d) => (stdout += d.toString()));
    cmd.stderr.on("data", (d) => (stderr += d.toString()));
    cmd.on("error", reject);
    cmd.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `engine exited ${code}`));
      resolve(stdout);
    });
    cmd.stdin.write(JSON.stringify(payload));
    cmd.stdin.end();
  });
}

async function parseAst(payload) {
  const normalizedPayload = { ...payload, language: normalizeLanguage(payload.language) };
  try {
    const output = await parseWithRust(normalizedPayload);
    return JSON.parse(output);
  } catch (error) {
    return parseWithFallback(normalizedPayload, error);
  }
}

function reply(res, status, contentType, body) {
  res.writeHead(status, { ...CORS_HEADERS, "content-type": contentType });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return reply(res, 204, "text/plain; charset=utf-8", "");

  try {
    if (req.method === "POST" && req.url === "/parse") {
      const payload = await readJson(req);
      const ast = await parseAst(payload);
      return reply(res, 200, "application/json", JSON.stringify(ast));
    }
  } catch (err) {
    return reply(res, 400, "text/plain; charset=utf-8", String(err));
  }

  return reply(res, 404, "text/plain; charset=utf-8", "Not Found");
});

server.listen(PORT, () => {
  console.log(`parse server on http://localhost:${PORT}`);
});
