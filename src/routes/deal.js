const express = require("express");
const {
  getDealsList,
  deleteDeal,
  getPendingDeals,
  editDeal,
  getProductVariant,
  getProductVariantsByProductId,
  updateProductStatus,
  getDealsByUserId,
  uploadSearchImage,
  addDeal,
  deleteProductVariant,
  getProductImages,
  deleteImage,
} = require("../controllers/deal");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");
const multiUpload = require("../middleware/multiMulter");

const router = express.Router();

router.get("/", authMiddleware(["admin", "owner"]), getDealsList);
router.get("/product-variants", authMiddleware("admin"), getProductVariant);
router.get(
  "/product-variants/:productId",
  authMiddleware(["admin", "owner"]),
  getProductVariantsByProductId
);
router.get("/pending", authMiddleware("admin"), getPendingDeals);
router.delete("/:productId", authMiddleware(["admin", "owner"]), deleteDeal);
router.patch(
  "/:productId",
  authMiddleware(["admin", "owner"]),
  // upload.fields([
  //   { name: "images", maxCount: 500 },
  //   { name: "variant_image", maxCount: 10 },
  // ]),
  multiUpload,
  editDeal
);
router.post(
  "/addDeal",
  authMiddleware("owner"),
  upload.fields([{ name: "image", maxCount: 500 }]),
  addDeal
);
router.patch(
  "/products/status/:productId",
  authMiddleware("admin"),
  updateProductStatus
);
router.get("/user/:userId", authMiddleware("owner"), getDealsByUserId);
router.post("/saveSearchImage", authMiddleware("admin"), uploadSearchImage);
router.get(
  "/product-images/:productId",
  authMiddleware(["admin", "owner"]),
  getProductImages
);
router.patch(
  "/product-variants/delete/:product_variation_id",
  authMiddleware(["admin", "owner"]),
  deleteProductVariant
);
router.delete(
  "/product-images/:imageId",
  authMiddleware(["admin", "owner"]),
  deleteImage
);

module.exports = router;
