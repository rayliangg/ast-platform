export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response("ok", {
        headers: { "access-control-allow-origin": "*" },
      });
    }
    if (request.method === "POST" && url.pathname === "/parse") {
      const body = await request.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: true, echo: body }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    });
  },
};
