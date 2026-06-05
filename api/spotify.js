module.exports = async (req, res) => {
res.setHeader(
"Cache-Control",
"s-maxage=300, stale-while-revalidate"
);

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

try {
// Get Access Token
const tokenResponse = await fetch(
"https://accounts.spotify.com/api/token",
{
method: "POST",
headers: {
Authorization:
"Basic " +
Buffer.from(
CLIENT_ID + ":" + CLIENT_SECRET
).toString("base64"),
"Content-Type":
"application/x-www-form-urlencoded",
},
body: new URLSearchParams({
grant_type: "refresh_token",
refresh_token: REFRESH_TOKEN,
}),
}
);

```
const tokenData = await tokenResponse.json();

if (!tokenData.access_token) {
  return res.status(500).json({
    error: "Failed to get access token",
    spotifyResponse: tokenData,
  });
}

const accessToken = tokenData.access_token;

let currentlyPlaying = null;
let topArtists = [];
let topTracks = [];

// Currently Playing
try {
  const currentResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    }
  );

  if (currentResponse.status === 200) {
    const currentData = await currentResponse.json();

    currentlyPlaying = {
      track: currentData.item?.name || null,
      artist:
        currentData.item?.artists?.[0]?.name || null,
      albumArt:
        currentData.item?.album?.images?.[0]?.url || null,
    };
  }
} catch (err) {
  console.log(
    "Currently Playing Error:",
    err.message
  );
}

// Top Artists
try {
  const artistsResponse = await fetch(
    "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
    {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    }
  );

  if (artistsResponse.ok) {
    const artistsData = await artistsResponse.json();

    topArtists =
      artistsData.items?.map((artist) => ({
        name: artist.name,
        image: artist.images?.[0]?.url || null,
      })) || [];
  } else {
    console.log(
      "Artists Status:",
      artistsResponse.status
    );
  }
} catch (err) {
  console.log(
    "Artists Error:",
    err.message
  );
}

// Top Tracks (Last 4 Weeks)
try {
  const tracksResponse = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term",
    {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    }
  );

  if (tracksResponse.ok) {
    const tracksData = await tracksResponse.json();

    topTracks =
      tracksData.items?.map((track) => ({
        name: track.name,
        artist:
          track.artists?.[0]?.name || "Unknown",
      })) || [];
  } else {
    console.log(
      "Tracks Status:",
      tracksResponse.status
    );
  }
} catch (err) {
  console.log(
    "Tracks Error:",
    err.message
  );
}

return res.status(200).json({
  currentlyPlaying,
  topArtists,
  topTracks,
});
```

} catch (error) {
console.error(error);

```
return res.status(500).json({
  error: error.message,
});
```

}
};
