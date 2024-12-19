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
  addDeal,
  deleteProductVariant,
} = require("../controllers/deal");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");
const multiUpload = require("../middleware/multiMulter");

const router = express.Router();

router.get("/", authMiddleware("admin"), getDealsList);
router.get("/product-variants", authMiddleware("admin"), getProductVariant);
router.get(
  "/product-variants/:productId",
  authMiddleware(["admin", "owner"]),
  getProductVariantsByProductId
);
router.get("/pending", authMiddleware("admin"), getPendingDeals);
router.delete("/:productId", authMiddleware("admin"), deleteDeal);
router.patch(
  "/:productId",
  authMiddleware("admin"),
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
// router.put(
//   "/products/status/:productId",
//   authMiddleware("admin"),
//   updateProductStatus
// );

router.get("/user/:userId", authMiddleware("owner"), getDealsByUserId);

router.patch(
  "/product-variants/delete/:product_variation_id",
  authMiddleware(["admin", "owner"]),
  deleteProductVariant
);
module.exports = router;
