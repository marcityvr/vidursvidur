// ─────────────────────────────────────────────────────────────
//  In-memory cache — survives across requests in the same
//  serverless instance (Vercel keeps warm instances alive).
//  Falls back gracefully when the instance is cold.
// ─────────────────────────────────────────────────────────────
const cache = {
  token:   { value: null, expiresAt: 0 },
  data:    { value: null, cachedAt:  0 },
};

const DATA_TTL_MS  = 5 * 60 * 1000;   // re-fetch Spotify data every 5 min
const RETRY_AFTER  = 60 * 1000;        // back-off 60 s after a 429

// ── Token helper ──────────────────────────────────────────────
async function getAccessToken(clientId, clientSecret, refreshToken) {
  const now = Date.now();

  // Reuse cached token if it has > 30 s left
  if (cache.token.value && cache.token.expiresAt - now > 30_000) {
    return cache.token.value;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cache.token.value     = data.access_token;
  // expires_in is in seconds; subtract 60 s as a safety buffer
  cache.token.expiresAt = now + (data.expires_in - 60) * 1000;

  return cache.token.value;
}

// ── Fetch with retry on 429 ────────────────────────────────────
async function spotifyFetch(url, token, attempt = 1) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429 && attempt <= 3) {
    // Honour Retry-After header if present, otherwise back off exponentially
    const retryAfter = parseInt(res.headers.get("Retry-After") || "0", 10);
    const waitMs     = retryAfter > 0
      ? retryAfter * 1000
      : Math.min(RETRY_AFTER * attempt, 120_000);

    await new Promise(r => setTimeout(r, waitMs));
    return spotifyFetch(url, token, attempt + 1);
  }

  if (res.status === 204) return null;          // No Content (nothing playing)
  if (!res.ok)           return null;           // Swallow other errors gracefully

  return res.json();
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async (req, res) => {
  // Allow CORS for your frontend origin (tighten in production)
  res.setHeader("Access-Control-Allow-Origin", "*");

  const {
    SPOTIFY_CLIENT_ID:     CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN: REFRESH_TOKEN,
  } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return res.status(500).json({ error: "Missing Spotify env vars" });
  }

  try {
    // ── Serve from cache if fresh ──────────────────────────────
    const now = Date.now();
    if (cache.data.value && now - cache.data.cachedAt < DATA_TTL_MS) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cache.data.value);
    }

    const token = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);

    // ── Fire all three requests in parallel ───────────────────
    const [nowPlaying, topArtistsData, topTracksData] = await Promise.all([
      spotifyFetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        token
      ),
      spotifyFetch(
        "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
        token
      ),
      spotifyFetch(
        "https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term",
        token
      ),
    ]);

    // ── Shape the response ────────────────────────────────────
    const payload = {
      currentlyPlaying: nowPlaying?.item
        ? {
            track:    nowPlaying.item.name,
            artist:   nowPlaying.item.artists.map(a => a.name).join(", "),
            albumArt: nowPlaying.item.album.images[0]?.url ?? null,
            isPlaying: nowPlaying.is_playing,
          }
        : null,

      topArtists: topArtistsData?.items?.map(a => ({
        name:  a.name,
        image: a.images[0]?.url ?? null,
      })) ?? [],

      topTracks: topTracksData?.items?.map(t => ({
        name:   t.name,
        artist: t.artists.map(a => a.name).join(", "),
      })) ?? [],
    };

    // ── Store in cache ────────────────────────────────────────
    cache.data.value    = payload;
    cache.data.cachedAt = now;

    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);

  } catch (error) {
    console.error("[Spotify API]", error);

    // If we have stale cache, return it rather than an error
    if (cache.data.value) {
      res.setHeader("X-Cache", "STALE");
      return res.status(200).json(cache.data.value);
    }

    return res.status(500).json({ error: error.message });
  }
};
