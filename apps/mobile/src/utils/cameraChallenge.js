// Utility to fetch a Challenge Code from backend with graceful fallback
// Uses Expo public env vars. If the backend is unavailable, generates a deterministic-looking fallback.

const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL ||
  process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
  process.env.EXPO_PUBLIC_HOST ||
  "";

function generateFallbackChallengeCode(userId, requestId) {
  const seed = `${userId || "user"}-${requestId || "req"}-${Date.now()}`;
  const hash = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "ECHO";
  for (let i = 0; i < 8; i++) {
    const idx = (hash >>> (i * 4)) % alphabet.length; // unsigned shift to avoid negative modulo
    code += alphabet[idx];
  }
  return code;
}

export async function fetchChallengeCode({ userId, requestId, signal }) {
  // If no backend configured, return fallback immediately
  if (!BASE_URL) {
    return generateFallbackChallengeCode(userId, requestId);
  }

  try {
    const url = `${BASE_URL.replace(/\/$/, "")}/api/camera/challenge?userId=${encodeURIComponent(
      userId || ""
    )}&requestId=${encodeURIComponent(requestId || "")}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Challenge fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (data?.code && typeof data.code === "string") {
      return data.code;
    }
    return generateFallbackChallengeCode(userId, requestId);
  } catch (e) {
    console.warn("Challenge code fetch error:", e?.message || e);
    return generateFallbackChallengeCode(userId, requestId);
  }
}
