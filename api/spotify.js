module.exports = async (req, res) => {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

  try {
    const response = await fetch(
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

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
