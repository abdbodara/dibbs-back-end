const express = require("express");
const {
  getPushNotificationList,
  createPushNotification,
  deletePushNotification,
} = require("../controllers/pushAlerts");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getPushNotificationList);
router.post("/createNotication", authMiddleware("admin"), createPushNotification);
router.delete(
  "/deleteNotification/:notification_id",
  authMiddleware("admin"),
  deletePushNotification
);

module.exports = router;
