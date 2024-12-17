const express = require("express");
const {
  getCouponList,
  deleteCoupon,
  createCoupon,
} = require("../controllers/coupon");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getCouponList);
router.delete("/deleteCoupons/:coupon_id", authMiddleware("admin"), deleteCoupon);
router.post("/createCoupons", authMiddleware("admin"), createCoupon);

module.exports = router;
