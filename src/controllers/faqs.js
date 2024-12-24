const { db } = require("../db/config");

const createFaq = async (req, res) => {
  try {
    const { question, answer, status } = req.body;

    if (!question || !answer || !status) {
      return res
        .status(400)
        .json({ error: "Question, answer, and status are required fields." });
    }

    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Allowed values are 'active' or 'inactive'.",
      });
    }

    const addedBy = req.user ? req.user.id : null;
    const addedOn = new Date().toISOString().slice(0, 19).replace("T", " ");

    const [result] = await db.query(
      "INSERT INTO faqs (question, answer, status, added_on, added_by) VALUES (?, ?, ?, ?, ?)",
      [question, answer, status, addedOn, addedBy]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to create FAQ." });
    }

    res.status(201).json({
      message: "FAQ created successfully.",
      question,
      answer,
      status,
      addedBy,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    res.status(500).json({
      error: "An error occurred while creating the FAQ.",
      details: error.message,
    });
  }
};

const getFaqsList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM faqs WHERE status IN (?, ?)",
      ["active", "inactive"]
    );

    if (totalRecords === 0) {
      return res
        .status(404)
        .json({ error: "No FAQs found with the given status." });
    }

    const [rows] = await db.query(
      `SELECT * FROM faqs 
       WHERE status IN (?, ?) 
       ORDER BY added_by DESC 
       LIMIT ? OFFSET ?`,
      ["active", "inactive", limit, offset]
    );

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: rows,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);

    res.status(500).json({
      error: "An error occurred while fetching FAQs.",
      details: error.message,
    });
  }
};

const deleteFaq = async (req, res) => {
  try {
    const { faq_id } = req.params;
    console.log("🚀 ~ deleteFaq ~ faq_id:", faq_id);
    const [faq] = await db.query(
      "SELECT * FROM faqs WHERE auto_id = ? AND status IN ('active', 'inactive')",
      [faq_id]
    );

    if (faq.length === 0) {
      return res
        .status(404)
        .json({ error: "FAQ not found or already deleted." });
    }

    const [result] = await db.query(
      "UPDATE faqs SET status = 'deleted' WHERE auto_id = ?",
      [faq_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to delete FAQ." });
    }

    res.status(200).json({
      message: "FAQ deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({
      error: "An error occurred while deleting the FAQ.",
      details: error.message,
    });
  }
};

const updateFaq = async (req, res) => {
  try {
    const { faq_id } = req.params;
    const { question, answer, status } = req.body;
    if (!question || !answer || !status) {
      return res
        .status(400)
        .json({ error: "Question, answer, and status are required fields." });
    }

    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Allowed values are 'active' or 'inactive'.",
      });
    }

    const [faq] = await db.query(
      "SELECT * FROM faqs WHERE auto_id = ? AND status IN ('active', 'inactive')",
      [faq_id]
    );

    if (faq.length === 0) {
      return res
        .status(404)
        .json({ error: "FAQ not found or cannot be updated." });
    }

    const [result] = await db.query(
      "UPDATE faqs SET question = ?, answer = ?, status = ?, updated_on = NOW() WHERE auto_id = ?",
      [question, answer, status, faq_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to update FAQ." });
    }

    res.status(200).json({
      message: "FAQ updated successfully.",
      question,
      answer,
      status,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({
      error: "An error occurred while updating the FAQ.",
      details: error.message,
    });
  }
};

module.exports = {
  getFaqsList,
  deleteFaq,
  updateFaq,
  createFaq,
};
