const express = require("express");
const {
  getSupportList,
  updateSupportStatus,
} = require("../controllers/support");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getSupportList);
router.patch("/updateStatus/:support_id", authMiddleware("admin"), updateSupportStatus);

module.exports = router;
