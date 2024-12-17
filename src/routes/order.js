const express = require("express");
const {
  getOrders,
  getOrderById,
  cancelOrder,
  getOrdersByUserId,
} = require("../controllers/order");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getOrders);
router.put("/cancel/:orderId", authMiddleware("admin"), cancelOrder);
router.get("/:orderId", authMiddleware("admin"), getOrderById);
router.get("/user/:userId", authMiddleware("owner"), getOrdersByUserId);

module.exports = router;
