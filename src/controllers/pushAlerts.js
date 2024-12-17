const { db } = require("../db/config");

const getPushNotificationList = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM push_alerts");
    if (rows.length === 0) {
      return res.status(404).json({ error: "No Push Notification Found." });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching push notification:", error);

    res.status(500).json({
      error: "An error occurred while fetching push notification.",
      details: error.message,
    });
  }
};

const createPushNotification = async (req, res) => {
  try {
    const { audiance, heading, message, customer_id } = req.body;

    if (!audiance || !heading || !message) {
      return res.status(400).json({
        error: "Audience, heading, and message are required fields.",
      });
    }

    const validAudiences = ["all", "specific customer"];
    if (!validAudiences.includes(audiance)) {
      return res.status(400).json({
        error:
          "Invalid audience. Allowed values are 'all' or 'specific customer'.",
      });
    }

    const addedBy = req.user ? req.user.id : null;

    const addedOn = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [result] = await db.query(
      "INSERT INTO push_alerts (audiance, customer_id, heading, message, added_on, added_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        audiance,
        audiance === "customer" ? customer_id : null,
        heading,
        message,
        addedOn,
        addedBy,
      ]
    );
    if (result.affectedRows === 0) {
      return res
        .status(500)
        .json({ error: "Failed to create push notification." });
    }

    res.status(201).json({
      message: "Push notification created successfully.",
      audiance,
      customer_id: audiance === "customer" ? customer_id : null,
      heading,
      message,
      added_on: addedOn,
      added_by: addedBy,
    });
  } catch (error) {
    console.error("Error creating push notification:", error);
    res.status(500).json({
      error: "An error occurred while creating the push notification.",
      details: error.message,
    });
  }
};

const deletePushNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;

    const [notification] = await db.query(
      "SELECT * FROM push_alerts WHERE auto_id = ? AND status != 'deleted'",
      [notification_id]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: "Push notification not found." });
    }

    const [result] = await db.query(
      "UPDATE push_alerts SET status = 'deleted' WHERE auto_id = ?",
      [notification_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to delete push notification." });
    }

    res.status(200).json({ message: "Push notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting push notification:", error);
    res.status(500).json({
      error: "An error occurred while deleting the push notification.",
      details: error.message,
    });
  }
};

module.exports = {
  getPushNotificationList,
  createPushNotification,
  deletePushNotification
};
