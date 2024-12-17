const express = require("express");
const {
  getFaqsList,
  createFaq,
  updateFaq,
  deleteFaq,
} = require("../controllers/faqs");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/createFaq", authMiddleware("admin"), createFaq);
router.get("/", authMiddleware("admin"), getFaqsList);
router.delete("/deleteFaq/:faq_id", authMiddleware("admin"), deleteFaq);
router.patch("/updateFaq/:faq_id", authMiddleware("admin"), updateFaq);

module.exports = router;
