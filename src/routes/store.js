const express = require("express");
const {
  getStoresList,
  updateStoreStatus,
  deleteStore,
} = require("../controllers/store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getStoresList);
router.put("/:store_id", authMiddleware("admin"), updateStoreStatus);
router.delete("/deleteStore/:store_id", authMiddleware("admin"), deleteStore);

module.exports = router;
