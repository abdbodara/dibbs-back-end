const { db } = require("../db/config");

const getDealsList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.searchTerm || "";

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords " +
        "FROM products p " +
        "LEFT JOIN stores s ON p.store_id = s.store_id " +
        "WHERE p.status IN (?, ?, ?, ?) AND " +
        "(p.product_id LIKE ? OR p.product_name LIKE ? OR s.store_name LIKE ? OR p.description LIKE ?)",
      [
        "active",
        "inactive",
        "rejected",
        "pending",
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
      ]
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No deals found." });
    }

    const [rows] = await db.query(
      `SELECT p.*, s.store_name, 
              IFNULL(pv.variation_count, 0) as products_variations 
       FROM products p
       LEFT JOIN (
           SELECT product_id, COUNT(*) as variation_count
           FROM products_variations
           WHERE status = 'active'
           GROUP BY product_id
       ) pv ON p.product_id = pv.product_id
       LEFT JOIN stores s ON p.store_id = s.store_id
       WHERE p.status IN (?, ?, ?, ?) AND 
       (p.product_id LIKE ? OR p.product_name LIKE ? OR s.store_name LIKE ? OR p.description LIKE ?)
       ORDER BY p.added_on DESC 
       LIMIT ? OFFSET ?`,
      [
        "active",
        "inactive",
        "rejected",
        "pending",
        `%${searchQuery}%`,
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
    console.error("Error fetching deals:", error);

    res.status(500).json({
      error: "An error occurred while fetching deals.",
      details: error.message,
    });
  }
};

const updateProductStatus = async (req, res) => {
  const { productId } = req.params;
  const { status } = req.body;
  try {
    const [productRows] = await db.query(
      "SELECT * FROM products WHERE product_id = ? AND status = ?",
      [productId, "pending"]
    );

    if (productRows.length === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or not in pending status." });
    }

    let newStatus;
    if (status === "approve") {
      newStatus = "active";
    } else if (status === "reject") {
      newStatus = "deleted";
    } else {
      return res.status(400).json({ error: "Invalid status." });
    }

    await db.query("UPDATE products SET status = ? WHERE product_id = ?", [
      newStatus,
      productId,
    ]);

    res.status(200).json({
      message: `Product status updated to '${newStatus}' successfully.`,
    });
  } catch (error) {
    console.error("Error updating product status:", error);

    res.status(500).json({
      error: "An error occurred while updating product status.",
      details: error.message,
    });
  }
};

const getProductVariant = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM products_variations WHERE status = ?",
      ["active"]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No Product Variation found." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching deals:", error);

    res.status(500).json({
      error: "An error occurred while fetching product variation.",
      details: error.message,
    });
  }
};

const getProductVariantsByProductId = async (req, res) => {
  const productId = req.params.productId;

  try {
    const [productRows] = await db.query(
      "SELECT status FROM products WHERE product_id = ?",
      [productId]
    );

    if (productRows[0].status === "deleted") {
      return res.status(404).json({ error: "Product not found." });
    }

    const [rows] = await db.query(
      "SELECT * FROM products_variations WHERE product_id = ? AND status = ?",
      [productId, "active"]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No product variants found for the given product ID." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching product variants:", error);

    res.status(500).json({
      error: "An error occurred while fetching product variants.",
      details: error.message,
    });
  }
};

const getPendingDeals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.searchTerm || "";

    // Fetch total record count with search filtering
    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords " +
        "FROM products p " +
        "LEFT JOIN stores s ON p.store_id = s.store_id " +
        "WHERE p.status = ? AND " +
        "(p.product_id LIKE ? OR p.product_name LIKE ? OR s.store_name LIKE ? OR p.description LIKE ?)",
      [
        "pending",
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
      ]
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No pending deals found." });
    }

    const [rows] = await db.query(
      `SELECT p.*, 
              s.store_name, 
              IFNULL(pv.variation_count, 0) as products_variations 
       FROM products p
       LEFT JOIN (
           SELECT product_id, COUNT(*) as variation_count
           FROM products_variations
           WHERE status = 'active'
           GROUP BY product_id
       ) pv ON p.product_id = pv.product_id
       LEFT JOIN stores s ON p.store_id = s.store_id
       WHERE p.status = ? AND 
       (p.product_id LIKE ? OR p.product_name LIKE ? OR s.store_name LIKE ? OR p.description LIKE ?)
       ORDER BY p.added_on DESC 
       LIMIT ? OFFSET ?`,
      [
        "pending",
        `%${searchQuery}%`,
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
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching pending deals:", error);

    res.status(500).json({
      error: "An error occurred while fetching pending deals.",
      details: error.message,
    });
  }
};

const deleteDeal = async (req, res) => {
  const productId = req.params.productId;

  try {
    const [productRows] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    await db.query("UPDATE products SET status = ? WHERE product_id = ?", [
      "deleted",
      productId,
    ]);

    res
      .status(200)
      .json({ message: "Product marked as deleted successfully." });
  } catch (error) {
    console.error("Error marking product as deleted:", error);

    res.status(500).json({
      error: "An error occurred while marking the product as deleted.",
      details: error.message,
    });
  }
};

const editDeal = async (req, res) => {
  const productId = req.params.productId;
  const {
    product_name,
    description,
    category,
    owner_share,
    end_date_time,
    end_time,
    return_policy,
    purchase_valid,
    per_person_purchase,
    appointment,
    status,
    uploadedImages,
  } = req.body;

  const files = req.files;

  const uploadedVariantImages = [];

  const currentTimestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const formattedEndDateTime = new Date(end_date_time)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const updatedBy = req.user?.id;
  const variants = [];
  for (const key in req.body) {
    const match = key.match(/^variants\[(\d+)\](\w+)$/);
    if (match) {
      const index = match[1];
      const field = match[2];
      if (!variants[index]) variants[index] = {};
      variants[index][field] = req.body[key];
    }
  }

  try {
    const [productRows] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (variants && Array.isArray(variants)) {
      for (const [index, variant] of variants.entries()) {
        const {
          variantId,
          variant_name,
          product_price,
          discount,
          productsTags,
        } = variant;

        if (variantId) {
          const [variantRows] = await db.query(
            "SELECT * FROM products_variations WHERE auto_id = ?",
            [variantId]
          );

          if (variantRows.length === 0) {
            return res.status(404).json({ error: "Variant not found." });
          }

          if (variantRows[0].product_id !== parseInt(productId, 10)) {
            return res.status(400).json({
              error: "Variant does not belong to the specified product.",
            });
          }

          if (variantRows[0].status !== "active") {
            return res.status(400).json({ error: "Variant is not active." });
          }

          if (files) {
            files.forEach((file) => {
              const match = file.fieldname.match(
                /^variants\[(\d+)\]variant_image$/
              );
              if (match) {
                const extractedIndex = match[1];
                if (extractedIndex == index) {
                  if (!uploadedVariantImages[index]) {
                    uploadedVariantImages[index] = [];
                  }
                  uploadedVariantImages[index].push(file.filename);
                }
              }
            });
          }

          await db.query(
            `UPDATE products_variations SET
              name = ?, 
              price = ?, 
              discount = ?, 
              image = ?,
              tags = ?,
              updated_by = ?, 
              updated_on = ?
            WHERE auto_id = ?`,
            [
              variant_name,
              product_price,
              discount,
              uploadedVariantImages[index]?.[0] || null,
              productsTags,
              updatedBy,
              currentTimestamp,
              variantId,
            ]
          );
        } else {
          await db.query(
            `INSERT INTO products_variations 
            (product_id, name, price, discount, image, tags, added_by, added_on, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
              productId,
              variant_name,
              product_price,
              discount,
              uploadedVariantImages[index]?.[0] || null,
              productsTags,
              updatedBy,
              currentTimestamp,
            ]
          );
        }
      }
    }

    await db.query(
      `UPDATE products SET
          product_name = ?, 
          description = ?, 
          category = ?, 
          owner_share = ?, 
          end_date_time = ?, 
          end_time = ?, 
          return_policy = ?, 
          purchase_valid = ?, 
          per_person_purchase = ?, 
          appointment = ?, 
          status = ?
        WHERE product_id = ?`,
      [
        product_name,
        description,
        category,
        owner_share,
        formattedEndDateTime,
        end_time,
        return_policy,
        purchase_valid,
        per_person_purchase,
        appointment,
        status,
        productId,
      ]
    );

    const uploadedImagePaths = uploadedImages?.map((img) => img.image || img);

    const [existingImages] = await db.query(
      "SELECT * from products_images WHERE product_id = ? AND status = 'active'",
      [productId]
    );

    const existingImagePath = existingImages.map((img) => img.image);

    const imagesToAdd = uploadedImagePaths?.filter(
      (img) => !existingImagePath.includes(img)
    );

    const imagesToDelete = existingImages?.filter(
      (img) => !uploadedImages.includes(img.image)
    );

    for (const imgPath of imagesToAdd) {
      console.log("🚀 ~ editDeal ~ imgPath:", imgPath);
      await db.query(
        `INSERT INTO products_images (product_id, image, added_on, added_by, status) VALUES (?, ?, ?, ?, 'active')`,
        [productId, imgPath, currentTimestamp, productId]
      );
    }

    for (const img of imagesToDelete) {
      await db.query(
        `UPDATE products_images SET status = 'deleted' WHERE auto_id = ?`,
        [img.auto_id]
      );
    }
    const [updatedProduct] = await db.query(
      `SELECT * FROM products WHERE product_id = ?`,
      [productId]
    );

    const [productVariations] = await db.query(
      `SELECT * FROM products_variations WHERE product_id = ? AND status = 'active'`,
      [productId]
    );

    res.status(200).json({
      message: "Product and variations updated successfully.",
      product: updatedProduct[0],
      variations: productVariations,
    });
  } catch (error) {
    console.error("Error updating product and variations:", error);
    res.status(500).json({
      error: "An error occurred while updating the product and variations.",
      details: error.message,
    });
  }
};

const addDeal = async (req, res) => {
  console.log(req.body, "req");
  try {
    const {
      product_name,
      description,
      category,
      end_date_time,
      end_time,
      return_policy,
      purchase_valid,
      per_person_purchase,
      appointment,
      status,
      offer_price,
      discount,
      variant_name,
      product_price,
      productVariantDiscount,
      uploadedImages,
    } = req.body;

    const user = req.user;
    const image = req.files["image"] || [];
    console.log("🚀 ~ addDeal ~ image:", image);
    const endDate = new Date(end_date_time).toISOString().slice(0, 10);
    const endTime =
      end_time || new Date(end_date_time).toISOString().slice(11, 19);
    const storeQuery = `SELECT store_id FROM stores WHERE user_id = ?`;
    const storeResult = await db.query(storeQuery, [user.id]);

    if (storeResult.length === 0) {
      return res
        .status(404)
        .json({ message: "No store associated with the current user." });
    }

    const store_id = storeResult[0][0].store_id;
    const defaultPrice = 1;
    const defaultDiscount = 1;

    // if (
    //   !product_name ||
    //   !description ||
    //   !category ||
    //   !end_date_time ||
    //   !end_time ||
    //   !status ||
    //   !variant_name ||
    //   !product_price ||
    //   !productVariantDiscount
    // ) {
    //   return res
    //     .status(400)
    //     .json({ message: "Please fill in all required fields." });
    // }

    // if (isNaN(offer_price) || isNaN(discount)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Invalid price or discount values." });
    // }

    const added_on = new Date().toISOString().slice(0, 19).replace("T", " ");

    const query = `
          INSERT INTO products (
            product_name, description, category, end_date_time, end_time, return_policy,
            purchase_valid, per_person_purchase, appointment, status, price, discount, image,
            store_id, added_on, added_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const params = [
      product_name,
      description,
      category,
      endDate,
      endTime,
      return_policy || null,
      purchase_valid || null,
      per_person_purchase || null,
      appointment || null,
      status,
      defaultPrice,
      defaultDiscount,
      null,
      store_id,
      added_on,
      user.id,
    ];

    const [result] = await db.query(query, params);
    const newDealId = result.insertId;

    const fetchQuery = `SELECT * FROM products WHERE product_id = ?`;
    const [newDeal] = await db.query(fetchQuery, [newDealId]);

    const parseVariants = (body) => {
      const variants = [];
      for (const key in body) {
        const match = key.match(/^variants\[(\d+)\](\w+)$/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
          if (!variants[index]) {
            variants[index] = {};
          }
          variants[index][field] = body[key];
        }
      }
      return variants;
    };

    const variants = parseVariants(req.body);
    console.log("Parsed Variants:", variants);

    if (newDeal[0]?.product_id) {
      console.log("🚀 ~ addDeal ~ newDeal:", newDeal);
      try {
        if (Array.isArray(variants) && variants.length > 0) {
          for (const variant of variants) {
            const variationQuery = `
              INSERT INTO products_variations (
                product_id, name, price, discount, added_on, added_by
              ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            const variationParams = [
              newDeal[0].product_id,
              variant.variant_name,
              variant.product_price,
              variant.productVariantDiscount,
              added_on,
              user.id,
            ];

            await db.query(variationQuery, variationParams);
          }
        }
      } catch (error) {
        console.log("🚀 ~ addDeal ~ error:", error);
        console.error("Variant names are missing or invalid.");
      }

      if (uploadedImages.length > 0) {
        console.log("🚀 ~ addDeal ~ newDealId:", newDealId);
        const [existingImages] = await db.query(
          "SELECT * FROM products_images WHERE product_id = ? AND status = 'active'",
          [newDealId]
        );

        const existingImagePath = existingImages.map((img) => img.image);

        const imagesToAdd = uploadedImages.filter(
          (img) => !existingImagePath.includes(img.filename)
        );
        console.log("🚀 ~ addDeal ~ imagesToAdd:", imagesToAdd);

        const imagesToDelete = existingImages.filter(
          (img) =>
            !image.some((uploadedImg) => uploadedImg.filename === img.image)
        );

        const currentTimestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        for (const img of imagesToAdd) {
          await db.query(
            `INSERT INTO products_images (product_id, image, added_on, added_by, status) VALUES (?, ?, ?, ?, 'active')`,
            [newDealId, img, currentTimestamp, user.id]
          );
        }

        for (const img of imagesToDelete) {
          await db.query(
            `UPDATE products_images SET status = 'deleted' WHERE id = ?`,
            [img.id]
          );
        }
      }

      res.status(201).json({
        message: "Deal added successfully.",
        newDealId,
        productDetails: newDeal[0],
      });
    } else {
      res
        .status(500)
        .json({ message: "Error inserting the deal into the database." });
    }
  } catch (error) {
    console.error("🚀 ~ addDeal ~ error:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the deal." });
  }
};

const getDealsByUserId = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const searchTerm = req.query.searchTerm || "";

  try {
    const [userRows] = await db.query(
      "SELECT store_id FROM users WHERE user_id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(200).json({
        data: [],
        message: "User not found.",
        pagination: null,
      });
    }
    const storeId = userRows[0].store_id;

    const [[{ totalRecords }]] = await db.query(
      `SELECT COUNT(*) as totalRecords 
       FROM products 
       WHERE store_id = ? AND status IN (?, ?) 
       AND (product_name LIKE ? OR description LIKE ?)`,
      [storeId, "active", "inactive", `%${searchTerm}%`, `%${searchTerm}%`]
    );

    if (totalRecords === 0) {
      return res.status(200).json({
        data: [],
        message: "No deals found for the user.",
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        },
      });
    }

    const [deals] = await db.query(
      `SELECT p.*, s.store_name, 
              IFNULL(pv.variation_count, 0) as products_variations 
       FROM products p
       LEFT JOIN (
           SELECT product_id, COUNT(*) as variation_count
           FROM products_variations
           WHERE status = 'active'
           GROUP BY product_id
       ) pv ON p.product_id = pv.product_id
       LEFT JOIN stores s ON p.store_id = s.store_id
       WHERE p.store_id = ? AND p.status IN (?, ?) 
       AND (p.product_name LIKE ? OR p.description LIKE ?) 
       ORDER BY p.added_on DESC 
       LIMIT ? OFFSET ?`,
      [
        storeId,
        "active",
        "inactive",
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        limit,
        offset,
      ]
    );

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: deals,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching deals by user ID:", error);

    res.status(500).json({
      error: "An error occurred while fetching deals.",
      details: error.message,
    });
  }
};

const getProductImages = async (req, res) => {
  const { productId } = req.params;

  try {
    const [images] = await db.query(
      `SELECT * 
       FROM products_images 
       WHERE product_id = ? AND status = 'active'`,
      [productId]
    );

    if (images.length === 0) {
      return res
        .status(404)
        .json({ error: "No images found for this product." });
    }

    res.status(200).json({
      images,
    });
  } catch (error) {
    console.error("Error fetching product images:", error);

    res.status(500).json({
      error: "An error occurred while fetching product images.",
      details: error.message,
    });
  }
};

const uploadSearchImage = async (req, res) => {
  const { productId, imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  try {
    const currentTimestamp = new Date();
    const formattedTimestamp = currentTimestamp
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await db.query(
      `INSERT INTO products_images (image, added_on, status, product_id, added_by) VALUES (?, ?, 'active', ?, ?)`,
      [imageUrl, formattedTimestamp, productId, productId]
    );

    res.status(200).json({ message: "Image upload initiated successfully" });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Error uploading the image" });
  }
};

const deleteProductVariant = async (req, res) => {
  try {
    const { product_variation_id } = req.params;

    const checkQuery = "SELECT * FROM products_variations WHERE auto_id = ?";
    const [existingVariation] = await db.query(checkQuery, [
      product_variation_id,
    ]);

    if (existingVariation.length === 0) {
      return res.status(404).json({ message: "Product variation not found." });
    }

    const variationStatus = existingVariation[0].status;
    if (variationStatus !== "active") {
      return res
        .status(400)
        .json({ message: "Product variation is not active." });
    }

    const deleteQuery =
      "UPDATE products_variations SET status = 'deleted' WHERE auto_id = ?";
    await db.query(deleteQuery, [product_variation_id]);

    res.status(200).json({ message: "Product variation marked as deleted." });
  } catch (error) {
    console.error("🚀 ~ deleteProductVariant ~ error:", error);
    res.status(500).json({
      message: "An error occurred while deleting the product variation.",
    });
  }
};
const deleteImage = async (req, res) => {
  const { imageId } = req.params;

  if (!imageId) {
    return res.status(400).json({ error: "Image ID is required" });
  }

  try {
    const query = `
      UPDATE products_images 
      SET status = 'deleted' 
      WHERE auto_id = ? AND status = 'active'
    `;
    const [result] = await db.query(query, [imageId]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Image not found or already deleted" });
    }

    res.status(200).json({ message: "Image status updated to deleted" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Failed to update image status" });
  }
};

module.exports = {
  getDealsList,
  getPendingDeals,
  deleteProductVariant,
  deleteDeal,
  editDeal,
  addDeal,
  getProductVariant,
  getProductVariantsByProductId,
  updateProductStatus,
  getDealsByUserId,
  uploadSearchImage,
  getProductImages,
  deleteImage,
};
