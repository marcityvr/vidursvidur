module.exports = (req, res) => {
res.status(200).json({
status: "working",
message: "Spotify endpoint is alive"
});
};
