/**
 * Password gate used ONLY by the real-app Cloudflare staging build.
 * Deploy with assets.run_worker_first=true so all assets and HTML are checked.
 * No production logic, no Supabase DB changes, and no customer files.
 */
const securityHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function safeEqual(a: string, b: string): boolean {
  const first = new TextEncoder().encode(a);
  const second = new TextEncoder().encode(b);
  let diff = first.length ^ second.length;
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    diff |= (first[i] ?? 0) ^ (second[i] ?? 0);
  }
  return diff === 0;
}

export function denyUnauthenticatedStagingRequest(
  request: Request,
  rawEnv: unknown,
): Response | null {
  const env = rawEnv as { STAGING_ACCESS_PASSWORD?: unknown } | null;
  const password = env?.STAGING_ACCESS_PASSWORD;
  if (typeof password !== "string" || password.length < 18) {
    return new Response("Collaudo non configurato.", {
      status: 503,
      headers: securityHeaders,
    });
  }

  const expected = "Basic " + btoa("nomotecnia:" + password);
  if (!safeEqual(request.headers.get("Authorization") ?? "", expected)) {
    return new Response("Accesso riservato al collaudo NomotecnIA.", {
      status: 401,
      headers: {
        ...securityHeaders,
        "WWW-Authenticate": 'Basic realm="NomotecnIA Full Staging"',
      },
    });
  }

  return null;
}
