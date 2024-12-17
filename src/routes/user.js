const express = require("express");
const { login, updateUserProfile, logout } = require("../controllers/user");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.post("/login", login);
router.post("/logout", authMiddleware("admin"), logout);
router.patch(
  "/profile",
  authMiddleware("admin"),
  upload.single("profileImage"),
  updateUserProfile
);

module.exports = router;
