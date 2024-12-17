const { db } = require("../db/config");

const getSupportList = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM customers_support");
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No active customer support queries found." });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching customer support queries:", error);
    res.status(500).json({
      error: "An error occurred while fetching customer support queries.",
      details: error.message,
    });
  }
};

const updateSupportStatus = async (req, res) => {
  const { support_id } = req.params;
  const { status } = req.body;

  if (!["done", "pending"].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be "done" or "pending".' });
  }
  try {
    const [result] = await db.query(
      "UPDATE customers_support SET status = ? WHERE auto_id = ?",
      [status, support_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Customer support queries not found" });
    }
    res.status(200).json({
      message: `Customer support queries status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating store status:", error);
    res.status(500).json({
      error: "An error occurred while updating the store status.",
      details: error.message,
    });
  }
};

module.exports = {
  getSupportList,
  updateSupportStatus,
};
