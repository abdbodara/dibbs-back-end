const express = require("express");
const {
  getPushNotificationList,
  createPushNotification,
  deletePushNotification,
  sendNotification,
} = require("../controllers/pushAlerts");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware("admin"), getPushNotificationList);
router.post(
  "/createNotication",
  authMiddleware("admin"),
  createPushNotification
);
router.delete(
  "/deleteNotification/:notification_id",
  authMiddleware("admin"),
  deletePushNotification
);
router.post("/send-notification", authMiddleware("admin"), sendNotification);

module.exports = router;
