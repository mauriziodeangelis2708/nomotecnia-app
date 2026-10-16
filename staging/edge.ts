interface StagingEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  STAGING_ACCESS_PASSWORD?: string;
}

function sameBytes(left: string, right: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(left);
  const b = enc.encode(right);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

const headers: Record<string, string> = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; font-src 'self' data:; connect-src 'none'; " +
    "worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

export default {
  async fetch(request: Request, env: StagingEnv): Promise<Response> {
    if (!env.STAGING_ACCESS_PASSWORD || env.STAGING_ACCESS_PASSWORD.length < 18) {
      return new Response("Staging non configurato.", {
        status: 503,
        headers,
      });
    }
    const expected = "Basic " + btoa("nomotecnia:" + env.STAGING_ACCESS_PASSWORD);
    if (!sameBytes(request.headers.get("Authorization") ?? "", expected)) {
      return new Response("Accesso riservato al collaudo NomotecnIA.", {
        status: 401,
        headers: { ...headers, "WWW-Authenticate": 'Basic realm="NomotecnIA PDF staging"' },
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Metodo non consentito.", {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD" },
      });
    }
    const result = await env.ASSETS.fetch(request);
    const response = new Response(result.body, result);
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    return response;
  },
};
