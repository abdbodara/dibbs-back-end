const { db } = require("../db/config");

const getStoresList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // const [rows] = await db.query(
    //   `SELECT stores.*, users.* FROM stores
    //    JOIN users ON stores.user_id = users.user_id
    //    ORDER BY stores.added_on DESC
    //    LIMIT ? OFFSET ?`,
    //   [limit, offset]
    // );

    const [rows] = await db.query(
      `SELECT stores.*, users.*, stores.status AS store_status, users.status AS user_status
       FROM stores
       JOIN users ON stores.user_id = users.user_id
       ORDER BY stores.added_on DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    console.log("🚀 ~ getStoresList ~ rows:", rows);

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM stores JOIN users ON stores.user_id = users.user_id"
    );
    console.log("🚀 ~ getStoresList ~ countResult:", countResult);
    const totalRecords = countResult[0].total;
    if (rows.length === 0) {
      return res.status(404).json({ error: "No stores found." });
    }

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
    console.error("Error fetching stores:", error);

    res.status(500).json({
      error: "An error occurred while fetching stores.",
      details: error.message,
    });
  }
};

const updateStoreStatus = async (req, res) => {
  const { store_id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be "active" or "inactive".' });
  }

  try {
    const [result] = await db.query(
      "UPDATE stores SET status = ? WHERE store_id = ?",
      [status, store_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.status(200).json({ message: `Store status updated to ${status}` });
  } catch (error) {
    console.error("Error updating store status:", error);
    res.status(500).json({
      error: "An error occurred while updating the store status.",
      details: error.message,
    });
  }
};

const deleteStore = async (req, res) => {
  try {
    const { store_id } = req.params;

    const [store] = await db.query(
      `SELECT * FROM stores WHERE store_id=?`,
      store_id
    );
    if (store.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    await db.query(`DELETE FROM stores WHERE store_id = ?`, [store_id]);

    return res.status(200).json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Error updating store status:", error);
    res.status(500).json({
      error: "An error occurred while updating the store status.",
      details: error.message,
    });
  }
};

module.exports = {
  getStoresList,
  updateStoreStatus,
  deleteStore,
};
