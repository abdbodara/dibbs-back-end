const express = require("express");
const {
  getCategoriesList,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categories");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.post(
  "/addCategory",
  authMiddleware("admin"),
  upload.single("image"),
  addCategory
);
router.get("/", authMiddleware(["admin", "owner"]), getCategoriesList);
router.patch(
  "/updateCategory/:auto_id",
  authMiddleware("admin"),
  upload.single("image"),
  updateCategory
);
router.delete(
  "/deleteCategory/:auto_id",
  authMiddleware("admin"),
  deleteCategory
);

module.exports = router;
