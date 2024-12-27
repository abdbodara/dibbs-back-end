const { db } = require("../db/config");

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.file ? req.file.path : null;
    const status = "active";
    const addedBy = req.user.id;

    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "Name and description are required." });
    }

    const addedOn = new Date().toISOString().slice(0, 19).replace("T", " ");

    const result = await db.query(
      "INSERT INTO categories (name, description, image, status, added_by, added_on) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, image, status, addedBy, addedOn]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to add category." });
    }

    res.status(201).json({
      message: "Category added successfully.",
      categoryId: result.insertId,
      categoryName: name,
      categoryDescription: description,
      categoryImage: image,
      addedOn: addedOn,
    });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({
      error: "An error occurred while adding the category.",
      details: error.message,
    });
  }
};

const getCategoriesList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM categories WHERE status = 'active'"
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No active categories found." });
    }
    const [rows] = await db.query(
      "SELECT * FROM categories WHERE status = 'active' ORDER BY added_on DESC LIMIT ? OFFSET ?",
      [limit, offset]
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
    console.error("Error fetching categories:", error);

    res.status(500).json({
      error: "An error occurred while fetching categories.",
      details: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { auto_id } = req.params;
    const { name, description } = req.body;
    const image = req.file ? req.file.path : null;
    const updatedBy = "1";

    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "Name and description are required." });
    }
    const [existingCategory] = await db.query(
      "SELECT * FROM categories WHERE auto_id = ? AND status = 'active'",
      [auto_id]
    );

    if (existingCategory.length === 0) {
      return res
        .status(404)
        .json({ error: "Category not found or already deleted." });
    }

    let updateFields = [
      "name = ?",
      "description = ?",
      "updated_by = ?",
      "updated_on = ?",
    ];
    let queryParams = [
      name,
      description,
      updatedBy,
      new Date().toISOString().slice(0, 19).replace("T", " "),
    ];

    if (image) {
      updateFields.push("image = ?");
      queryParams.push(image);
    }

    queryParams.push(auto_id);

    const query = `UPDATE categories SET ${updateFields.join(
      ", "
    )} WHERE auto_id = ? AND status = 'active'`;
    const [result] = await db.query(query, queryParams);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Category not found or already deleted." });
    }

    res.status(200).json({
      message: "Category updated successfully.",
      categoryId: auto_id,
      categoryName: name,
      categoryDescription: description,
      categoryImage: image,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      error: "An error occurred while updating the category.",
      details: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { auto_id } = req.params;

    const [category] = await db.query(
      "SELECT * FROM categories WHERE auto_id = ?",
      [auto_id]
    );

    if (category.length === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    await db.query(
      "UPDATE categories SET status = 'deleted' WHERE auto_id = ?",
      [auto_id]
    );

    res.status(200).json({ message: "Category marked as deleted." });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      details: error.message,
    });
  }
};

module.exports = {
  getCategoriesList,
  addCategory,
  updateCategory,
  deleteCategory,
};
