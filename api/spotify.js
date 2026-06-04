```javascript
export default async function handler(req, res) {
  res.status(200).json({
    status: "working",
    message: "Spotify endpoint is alive"
  });
}
```
