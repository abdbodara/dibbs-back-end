const express = require("express");
const {
  getCustomersList,
  updateCustomerStatus,
  updateReferralCredits,
  deleteCustomer,
} = require("../controllers/customer");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getCustomersList);
router.patch(
  "/status/:customer_id",
  authMiddleware("admin"),
  updateCustomerStatus
);
router.patch(
  "/referelcredit/:customer_id",
  authMiddleware("admin"),
  updateReferralCredits
);
router.delete(
  "/deleteCustomer/:customer_id",
  authMiddleware("admin"),
  deleteCustomer
);

module.exports = router;
