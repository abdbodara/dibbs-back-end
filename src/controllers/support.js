const { db } = require("../db/config");

const getSupportList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM customers_support"
    );

    if (totalRecords === 0) {
      return res
        .status(404)
        .json({ error: "No active customer support queries found." });
    }
    const [supportQueries] = await db.query(
      `SELECT 
        cs.*, 
        c.first_name, 
        c.last_name 
      FROM 
        customers_support cs
      LEFT JOIN 
        customers c
      ON 
        cs.customer_id = c.customer_id 
      ORDER BY 
        cs.auto_id DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    if (!supportQueries.length) {
      return res.status(404).json({
        error: "No customer support queries found for the selected page.",
      });
    }

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: supportQueries.map((query) => ({
        ...query,
        customer_name: `${query.first_name || ""} ${
          query.last_name || ""
        }`.trim(),
      })),
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
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
