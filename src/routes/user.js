const express = require("express");
const {
  login,
  updateUserProfile,
  logout,
  getProfile,
  forgotPassword,
  renderResetPasswordPage,
  resetPassword,
} = require("../controllers/user");
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
router.get("/profile", authMiddleware("admin"), getProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

forgotPassword;
module.exports = router;
