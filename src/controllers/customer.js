const { db } = require("../db/config");

const getCustomersList = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM customers"
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No customers found." });
    }

    const [rows] = await db.query("SELECT * FROM customers ORDER BY added_on DESC LIMIT ? OFFSET ?", [limit, offset]);

    const totalPages = Math.ceil(totalRecords / limit);


    res.status(200).json({
      data: rows,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: parseInt(page, 10),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);

    res.status(500).json({
      error: "An error occurred while fetching customers.",
      details: error.message,
    });
  }
};
const updateCustomerStatus = async (req, res) => {
  const { customer_id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be "active" or "inactive".' });
  }
  try {
    const [result] = await db.query(
      "UPDATE customers SET status = ? WHERE customer_id = ?",
      [status, customer_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.status(200).json({ message: `Customer status updated to ${status}` });
  } catch (error) {
    console.error("Error updating store status:", error);
    res.status(500).json({
      error: "An error occurred while updating the store status.",
      details: error.message,
    });
  }
};

const updateReferralCredits = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { refferal_credits } = req.body;

    if (!customer_id || refferal_credits === undefined) {
      return res
        .status(400)
        .json({ error: "Customer ID and referral credits are required." });
    }

    if (isNaN(refferal_credits) || refferal_credits < 0) {
      return res.status(400).json({
        error: "Referral credits must be a valid non-negative number.",
      });
    }

    const [existingCustomer] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [customer_id]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const [result] = await db.query(
      "UPDATE customers SET refferal_credits = ? WHERE customer_id = ?",
      [refferal_credits, customer_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Failed to update referral credits." });
    }

    res.status(200).json({
      message: "Referral credits updated successfully.",
    });
  } catch (error) {
    console.error("Error updating referral credits:", error);
    res.status(500).json({
      error: "An error occurred while updating referral credits.",
      details: error.message,
    });
  }
};

module.exports = {
  getCustomersList,
  updateCustomerStatus,
  updateReferralCredits,
};
