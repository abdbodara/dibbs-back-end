const { db } = require("../db/config");

const createCoupon = async (req, res) => {
  try {
    const { code, discount, email } = req.body;

    if (!code || !discount || !email) {
      return res.status(400).json({
        error: "code, discount, and email are required fields.",
      });
    }

    if (discount < 0 || discount > 100) {
      return res.status(400).json({
        error: "Discount must be a percentage between 0 and 100.",
      });
    }

    const addedOn = new Date().toISOString().slice(0, 19).replace("T", " ");
    const status = "active";

    const [result] = await db.query(
      "INSERT INTO discount_coupens (code, discount, email, added_on, status) VALUES (?, ?, ?, ?, ?)",
      [code, discount, email, addedOn, status]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to create coupon." });
    }

    res.status(201).json({
      message: "Coupon created successfully.",
      code,
      discount,
      email,
      added_on: addedOn,
      status,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      error: "An error occurred while creating the coupon.",
      details: error.message,
    });
  }
};

const getCouponList = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM discount_coupens WHERE status = 'active'"
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No active categories found." });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);

    res.status(500).json({
      error: "An error occurred while fetching categories.",
      details: error.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.params;
    console.log("🚀 ~ deleteCoupon ~ coupon_id:", coupon_id);
    if (!coupon_id) {
      return res.status(400).json({ error: "Coupon ID is required." });
    }
    const [coupon] = await db.query(
      "SELECT * FROM discount_coupens WHERE auto_id = ? AND status = 'active'",
      [coupon_id]
    );

    if (coupon.length === 0) {
      return res
        .status(404)
        .json({ error: "Coupon not found or already deleted." });
    }

    const [result] = await db.query(
      "UPDATE discount_coupens SET status = 'deleted' WHERE auto_id = ?",
      [coupon_id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to delete coupon." });
    }

    res.status(200).json({ message: "Coupon deleted successfully." });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      error: "An error occurred while deleting the coupon.",
      details: error.message,
    });
  }
};

module.exports = {
  getCouponList,
  deleteCoupon,
  createCoupon,
};