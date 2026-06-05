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

if (!tokenResponse.ok) {
  throw new Error(
    "Token request failed: " +
      tokenResponse.status
  );
}

const tokenData = await tokenResponse.json();
const accessToken = tokenData.access_token;

let currentlyPlaying = null;
let topArtists = [];
let topTracks = [];

// CURRENTLY PLAYING

try {
  const currentResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization:
          "Bearer " + accessToken,
      },
    }
  );

  if (currentResponse.status === 200) {
    const currentData =
      await currentResponse.json();

    currentlyPlaying = {
      track: currentData.item?.name,
      artist:
        currentData.item?.artists?.[0]?.name,
      albumArt:
        currentData.item?.album?.images?.[0]?.url,
    };
  }
} catch (err) {
  console.log(
    "Current track failed:",
    err.message
  );
}

// TOP ARTISTS (6 MONTHS)

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

```
topArtists =
  artistsData.items?.map((artist) => ({
    name: artist.name,
    image: artist.images?.[0]?.url,
  })) || [];
```

} else {
console.log(
"Artists Status:",
artistsResponse.status
);
}
} catch (err) {
console.log(
"Artists failed:",
err.message
);
}

// TOP TRACKS (4 WEEKS)

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

```
topTracks =
  tracksData.items?.map((track) => ({
    name: track.name,
    artist: track.artists?.[0]?.name,
  })) || [];
```

} else {
console.log(
"Tracks Status:",
tracksResponse.status
);
}
} catch (err) {
console.log(
"Tracks failed:",
err.message
);
}

return res.status(200).json({
currentlyPlaying,
topArtists,
topTracks,
});


} catch (error) {
console.error(error);


return res.status(500).json({
  error: error.message,
});


}
};
