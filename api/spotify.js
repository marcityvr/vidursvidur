module.exports = async (req, res) => {
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

try {
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

return res.status(200).json({
  tokenData,
});
```

} catch (error) {
return res.status(500).json({
error: error.message,
});
}
};
