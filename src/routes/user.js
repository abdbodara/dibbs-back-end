const express = require("express");
const {
  login,
  updateUserProfile,
  logout,
  getProfile,
  forgotPassword,
  updateStoreProfile,
  resetPassword,
  register,
  getStoreProfile,
} = require("../controllers/user");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware(["admin", "owner"]), logout);
router.patch(
  "/profile",
  authMiddleware("admin"),
  upload.single("profileImage"),
  updateUserProfile
);
router.patch(
  "/updateStoreProfile",
  authMiddleware("owner"),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "storeLogo", maxCount: 1 },
  ]),
  updateStoreProfile
);

router.get("/profile", authMiddleware(["admin", "owner"]), getProfile);
router.get("/storeProfile", authMiddleware("owner"), getStoreProfile);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

forgotPassword;
module.exports = router;
