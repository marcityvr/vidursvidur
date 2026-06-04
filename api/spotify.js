module.exports = async (req, res) => {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

  try {
    // Get fresh access token
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${CLIENT_ID}:${CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: REFRESH_TOKEN,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Currently Playing
    const currentResponse = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let currentlyPlaying = null;

    if (currentResponse.status === 200) {
      const currentData = await currentResponse.json();

      currentlyPlaying = {
        track: currentData.item?.name,
        artist: currentData.item?.artists?.[0]?.name,
        albumArt: currentData.item?.album?.images?.[0]?.url,
      };
    }

    // Top Artists (6 months)
    const artistsResponse = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const artistsData = await artistsResponse.json();

    const topArtists = artistsData.items?.map((artist) => ({
      name: artist.name,
      image: artist.images?.[0]?.url,
    }));

    // Top Tracks (6 months)
    const tracksResponse = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const tracksData = await tracksResponse.json();

    const topTracks = tracksData.items?.map((track) => ({
      name: track.name,
      artist: track.artists[0].name,
    }));

    res.status(200).json({
      currentlyPlaying,
      topArtists,
      topTracks,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};
