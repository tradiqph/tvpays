const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || undefined;
}

export function turnstileSecretKey(): string | undefined {
  const key =
    process.env.TURNSTILE_SECRET?.trim() ??
    process.env.TURNSTILE_SECRET_KEY?.trim();
  return key || undefined;
}

/** Both keys set — widget shown and token verified on login. */
export function isTurnstileConfigured(): boolean {
  return Boolean(turnstileSiteKey() && turnstileSecretKey());
}

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  remoteip?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = turnstileSecretKey();
  if (!secret) {
    return { ok: false, error: "Turnstile is not configured." };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set("remoteip", remoteip);

  let data: SiteverifyResponse;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, error: "Could not verify security check." };
  }

  if (!data.success) {
    return { ok: false, error: "Security check failed. Please try again." };
  }
  return { ok: true };
}
