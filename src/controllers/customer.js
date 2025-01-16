const { db } = require("../db/config");

const getCustomersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.searchTerm || "";

    const [[{ totalRecords }]] = await db.query(
      `SELECT COUNT(*) as totalRecords 
       FROM customers 
       WHERE customer_id LIKE ? OR first_name LIKE ? OR last_name LIKE ?`,
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No customers found." });
    }

    const [rows] = await db.query(
      `SELECT * 
       FROM customers 
       WHERE customer_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? 
       ORDER BY added_on DESC 
       LIMIT ? OFFSET ?`,
      [
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        limit,
        offset,
      ]
    );

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
    const { refferal_credits, credit_balance } = req.body;

    if (
      !customer_id ||
      (refferal_credits === undefined && credit_balance === undefined)
    ) {
      return res.status(400).json({
        error:
          "Customer ID and at least one of referral credits or credit balance are required.",
      });
    }

    if (refferal_credits !== undefined) {
      if (isNaN(refferal_credits) || refferal_credits < 0) {
        return res.status(400).json({
          error: "Referral credits must be a valid non-negative number.",
        });
      }
    }

    if (credit_balance !== undefined) {
      if (isNaN(credit_balance) || credit_balance < 0) {
        return res.status(400).json({
          error: "Credit balance must be a valid non-negative number.",
        });
      }
    }

    const [existingCustomer] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [customer_id]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    let updateQuery = "UPDATE customers SET ";
    let updateValues = [];

    if (refferal_credits !== undefined) {
      updateQuery += "refferal_credits = ?, ";
      updateValues.push(refferal_credits);
    }

    if (credit_balance !== undefined) {
      updateQuery += "credits = ?, ";
      updateValues.push(credit_balance);
    }

    updateQuery = updateQuery.slice(0, -2);

    updateQuery += " WHERE customer_id = ?";
    updateValues.push(customer_id);

    const [result] = await db.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to update credits." });
    }

    res.status(200).json({
      message: "Customer credits updated successfully.",
    });
  } catch (error) {
    console.error("Error updating credits:", error);
    res.status(500).json({
      error: "An error occurred while updating credits.",
      details: error.message,
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;

    if (!customer_id) {
      return res.status(400).json({ error: "Customer ID is required." });
    }

    const [existingCustomer] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [customer_id]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const [result] = await db.query(
      "DELETE FROM customers WHERE customer_id = ?",
      [customer_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to delete customer." });
    }

    res.status(200).json({
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      error: "An error occurred while deleting the customer.",
      details: error.message,
    });
  }
};

module.exports = {
  getCustomersList,
  updateCustomerStatus,
  updateReferralCredits,
  deleteCustomer,
};
