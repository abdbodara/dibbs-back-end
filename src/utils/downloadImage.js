const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../db/config");
const download = require("image-downloader");

const saveImageToDatabase = async (
  imageName,
  currentTimestamp,
  productId,
  addedBy
) => {
  try {
    const formattedTimestamp = new Date(currentTimestamp)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await db.query(
      `INSERT INTO products_images (image, added_on, status, product_id, added_by) VALUES (?, ?, 'active', ?, ?)`,
      [imageName, formattedTimestamp, productId, addedBy]
    );
    console.log("Image saved to database");
  } catch (error) {
    console.error("Error saving image to database:", error);
  }
};

const downloadImageAndSave = async (imageUrl, productId) => {
  const uploadDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const parsedUrl = new URL(imageUrl);
  const format = parsedUrl.searchParams.get("fm") || "jpg";

  const imageName = `image-${Date.now()}.${format}`;
  const destPath = path.join(uploadDir, imageName);

  options = {
    url: imageUrl,
    dest: destPath,
  };

  try {
    const currentTimestamp = new Date().toISOString();
    const { filename } = await download.image(options);
    const imageName = path.basename(filename);
    await saveImageToDatabase(
      `uploads/${imageName}`,
      currentTimestamp,
      productId,
      1
    );
  } catch (err) {
    console.log(err);
  }
};
module.exports = downloadImageAndSave;
