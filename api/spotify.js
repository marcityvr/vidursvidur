module.exports = async (req, res) => {
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

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const artistsResponse = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
      {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }
    );

    const artistsData = await artistsResponse.json();

    return res.status(200).json(artistsData);

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};
