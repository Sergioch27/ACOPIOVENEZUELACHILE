const path = require("path");
const express = require("express");

const router = express.Router();
const publicDir = path.join(__dirname, "..", "public");

router.get("/", (req, res) => res.sendFile(path.join(publicDir, "index.html")));

module.exports = router;
