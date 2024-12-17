const express = require("express");
const { getCounts, getUserCounts } = require("../controllers/dashboard");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getCounts);
router.get("/user/:userId", authMiddleware("owner"), getUserCounts);

module.exports = router;
