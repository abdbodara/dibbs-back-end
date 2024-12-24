const { db } = require("../db/config");
const gcm = require("node-gcm");

const getPushNotificationList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM push_alerts WHERE status != 'deleted'"
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No push notifications found." });
    }

    const [pushNotifications] = await db.query(
      "SELECT * FROM push_alerts WHERE status != 'deleted' ORDER BY added_on DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    if (!pushNotifications.length) {
      return res.status(404).json({ error: "No push notifications found." });
    }

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: pushNotifications,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching push notifications:", error);

    res.status(500).json({
      error: "An error occurred while fetching push notifications.",
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
      return res
        .status(404)
        .json({ error: "Failed to delete push notification." });
    }

    res
      .status(200)
      .json({ message: "Push notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting push notification:", error);
    res.status(500).json({
      error: "An error occurred while deleting the push notification.",
      details: error.message,
    });
  }
};

const createPushNotification = async (req, res) => {
  try {
    const { audiance, heading, message, customer_id, registrationTokens } =
      req.body;

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

    const apiKey = "AIzaSyAMv12ZDiyO-SMQGQI0zLsbJ1eALKs4qCs";

    const sender = new gcm.Sender(apiKey);

    const gcmMessage = new gcm.Message({
      notification: {
        title: heading,
        body: message,
      },
      data: {
        audiance,
        heading,
        message,
      },
    });
    console.log("🚀 ~ createPushNotification ~ gcmMessage:", gcmMessage);

    sender.send(gcmMessage, { registrationTokens }, (err, response) => {
      if (err) {
        console.log("Error sending push notification:", err);
      }
      console.log("Push notification sent successfully:", response);
      // return res.status(200).json({
      //   message: "Push notification sent successfully.",
      //   response,
      // });
    });

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

module.exports = {
  getPushNotificationList,
  createPushNotification,
  deletePushNotification,
};
