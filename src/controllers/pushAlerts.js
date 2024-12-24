const { db } = require("../db/config");

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


module.exports = {
  getPushNotificationList,
  createPushNotification,
  deletePushNotification,
};
