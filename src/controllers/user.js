const { db } = require("../db/config");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");

const register = async (req, res) => {
  try {
    const { user_name, email, pwd, confirmPassword, store_name } = req.body;

    if (!user_name || !email || !pwd || !confirmPassword || !store_name) {
      return res.status(400).json({
        message: "All field are required.",
      });
    }
    if (pwd !== confirmPassword) {
      return res.status(401).json({
        message: "Password are not match",
      });
    }

    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO users (user_name, email, pwd,store_id, added_on) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_name, email, pwd, 0, new Date()]
    );

    const [storeResult] = await db.query(
      `INSERT INTO stores (user_id, store_name, added_on)
       VALUES (?, ?, ?)`,
      [result.insertId, store_name, new Date()]
    );

    await db.query(`UPDATE users SET store_id = ? WHERE user_id = ?`, [
      storeResult.insertId,
      result.insertId,
    ]);

    res.status(201).json({
      message: "User registered successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const query = "SELECT * FROM users WHERE email = ?";
    const [results] = await db.query(query, [email]);

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials or user not found.",
      });
    }

    const user = results[0];

    if (user.pwd !== password) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      { id: user.user_id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    res.json({
      message: "Login successful",
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      user_role: user.user_role,
      referral_credits: user.referral_credits,
      support_email: user.support_email,
      signup_credits: user.signup_credits,
      signup_credits_expiry: user.signup_credits_expiry,
      product_admin_share: user.product_admin_share,
      send_signup_email: user.send_signup_email,
      profile_image: user.profile_image,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateStoreProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      user_name,
      email,
      pwd,
      store_name,
      phone,
      website,
      address,
      start_time,
      end_time,
      redeem_code,
      coupon_code,
      coupon_amount,
    } = req.body;
    console.log(req.body, "opopo");
    const { profileImage, storeLogo } = req.files;
    let userUpdateFields;
    let storeUpdateFields;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required.",
      });
    }

    userUpdateFields = {
      user_name,
      email,
      pwd,
    };

    if (profileImage && profileImage.length > 0) {
      userUpdateFields.image = profileImage[0].path;
    }
    const userUpdateQuery = Object.keys(userUpdateFields)
      .filter((key) => userUpdateFields[key] !== undefined)
      .map((key) => `${key} = ?`)
      .join(", ");
    console.log("🚀 ~ updateStoreProfile ~ userUpdateQuery:", userUpdateQuery);

    const userUpdateValues = Object.keys(userUpdateFields)
      .filter((key) => userUpdateFields[key] !== undefined)
      .map((key) => userUpdateFields[key]);
    console.log(
      "🚀 ~ updateStoreProfile ~ userUpdateValues:",
      userUpdateValues
    );

    if (userUpdateQuery) {
      await db.query(`UPDATE users SET ${userUpdateQuery} WHERE user_id = ?`, [
        ...userUpdateValues,
        // new Date(),
        userId,
      ]);
    }

    storeUpdateFields = {
      store_name,
      phone,
      website,
      address,
      start_time,
      end_time,
      redeem_code,
      coupon_code,
      coupon_amount,
    };

    if (storeLogo && storeLogo.length > 0) {
      storeUpdateFields.image = storeLogo[0].path;
    }
    const storeUpdateQuery = Object.keys(storeUpdateFields)
      .filter((key) => storeUpdateFields[key] !== undefined)
      .map((key) => `${key} = ?`)
      .join(", ");

    const storeUpdateValues = Object.keys(storeUpdateFields)
      .filter((key) => storeUpdateFields[key] !== undefined)
      .map((key) => storeUpdateFields[key]);

    if (storeUpdateQuery) {
      await db.query(
        `UPDATE stores SET ${storeUpdateQuery}, updated_on = ? WHERE user_id = ?`,
        [...storeUpdateValues, new Date(), userId]
      );
    }
    const updatedUserData = await db.query(
      "SELECT * FROM users WHERE user_id = ?",
      [userId]
    );
    const updatedStoreData = await db.query(
      "SELECT * FROM stores WHERE user_id = ?",
      [userId]
    );

    res.status(200).json({
      message: "Profile updated successfully.",
      data: {
        user: updatedUserData[0],
        store: updatedStoreData[0],
      },
    });
  } catch (error) {
    console.log("🚀 ~ updateStoreProfile ~ error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const logout = (req, res) => {
  try {
    res.cookie("authToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      sameSite: "strict",
      expires: new Date(0),
    });

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during logout",
      error: error.message,
    });
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000,
  socketTimeout: 5000,
  logger: true,
  debug: true,
});

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const [rows] = await db.query(
      "SELECT user_id, email, user_name FROM users WHERE email = ? AND status = ?",
      [email, "active"]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Email not found or user is inactive." });
    }

    const user = rows[0];
    const resetToken = Buffer.from(email).toString("base64");
    const resetLink = `${process.env.SITE_URL}resetPassword?token=${resetToken}`;

    const mailOptions = {
      from: `"DIBBS" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Forgot Password On DIBBS",
      html: `
        <p>Dear ${user.user_name},</p>
        <p>Please follow this link to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Thank you,<br>The DIBBS Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      data: { link: resetLink },
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
};

const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.query;

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const decodedEmail = Buffer.from(token, "base64").toString("utf-8");

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND status = ?",
      [decodedEmail, "active"]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ message: "User not found or account is inactive" });
    }

    const user = rows[0];

    await db.query("UPDATE users SET pwd = ? WHERE email = ?", [
      password,
      decodedEmail,
    ]);

    res.status(200).json({ messege: "Password successfully updated" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    console.log(id, "id");
    const [user] = await db.query(
      "SELECT user_id, user_name, email, user_role, refferal_credits, image FROM users WHERE user_id = ?",
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user_id: user[0].user_id,
      fullName: user[0].user_name,
      email: user[0].email,
      user_role: user[0].user_role,
      referral_credits: user[0].referral_credits,
      profile_image: user[0].image,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getStoreProfile = async (req, res) => {
  try {
    const { id } = req.user;

    const [result] = await db.query(
      `SELECT 
        s.store_id, 
        s.store_name, 
        s.phone, 
        s.website, 
        s.address, 
        s.start_time, 
        s.end_time, 
        s.redeem_code, 
        s.coupen_code, 
        s.coupen_amount, 
       s.image AS store_logo, 
        u.user_name, 
        u.email, 
        u.pwd,
        u.image AS profile_image 
      FROM stores AS s
      JOIN users AS u ON s.user_id = u.user_id
      WHERE s.user_id = ?`,
      [id]
    );

    if (!result.length) {
      return res.status(404).json({ message: "Store not found" });
    }

    const store = result[0];
    console.log("🚀 ~ getStoreProfile ~ store:", store);

    res.json({
      store_id: store.store_id,
      store_name: store.store_name,
      phone: store.phone,
      website: store.website,
      address: store.address,
      start_time: store.start_time,
      end_time: store.end_time,
      redeem_code: store.redeem_code,
      coupon_code: store.coupen_code,
      coupon_amount: store.coupen_amount,
      store_logo: store.store_logo,
      user: {
        user_name: store.user_name,
        email: store.email,
        profile_image: store.profile_image,
        pwd: store.pwd,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const {
      user_name,
      refferal_credits,
      supportEmail,
      signupCredits,
      signupCreditsExpiry,
      productAdminShare,
      sendSignupEmail,
      newPassword,
      couponCode,
      couponAmount,
    } = req.body;

    const profileImage = req.body.profileImage || null;
    console.log(profileImage, "profileImage");

    const [user] = await db.query("SELECT * FROM users WHERE user_id = ?", [
      id,
    ]);
    if (!user.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const updateFields = [];
    const updateData = [];

    if (user_name) {
      updateFields.push("user_name = ?");
      updateData.push(user_name);
    }

    if (refferal_credits !== undefined) {
      updateFields.push("refferal_credits = ?");
      updateData.push(refferal_credits);
    }

    // if (supportEmail !== undefined) {
    //   updateFields.push("support_email = ?");
    //   updateData.push(supportEmail);
    // }

    // if (signupCredits !== undefined) {
    //   updateFields.push("signup_credits = ?");
    //   updateData.push(signupCredits);
    // }

    // if (signupCreditsExpiry !== undefined) {
    //   updateFields.push("signup_credits_expiry = ?");
    //   updateData.push(signupCreditsExpiry);
    // }

    // if (productAdminShare !== undefined) {
    //   updateFields.push("product_admin_share = ?");
    //   updateData.push(productAdminShare);
    // }

    // if (sendSignupEmail !== undefined) {
    //   updateFields.push("send_signup_email = ?");
    //   updateData.push(sendSignupEmail);
    // }

    // if (couponCode !== undefined) {
    //   updateFields.push("coupon_code = ?");
    //   updateData.push(couponCode);
    // }

    // if (couponAmount !== undefined) {
    //   updateFields.push("coupon_amount = ?");
    //   updateData.push(couponAmount);
    // }

    // if (profileImage) {
    //   updateFields.push("image = ?");
    //   updateData.push(profileImage);
    // }

    if (newPassword) {
      const hashedPassword = newPassword;
      updateFields.push("pwd = ?");
      updateData.push(hashedPassword);
    }

    if (updateFields.length > 0) {
      updateData.push(id);
      const updateQuery = `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE user_id = ?`;
      await db.query(updateQuery, updateData);
    }

    const appConfigFields = {
      support_email: supportEmail,
      signup_credits: signupCredits,
      signup_credits_expiry: signupCreditsExpiry,
      product_admin_share: productAdminShare,
      send_signup_email: sendSignupEmail,
      send_signup_email: sendSignupEmail,
    };

    await updateAppConfig(appConfigFields, id);

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while updating the profile.",
      error: error.message,
    });
  }
};

const updateAppConfig = async (appConfigFields, userId) => {
  for (const [fieldName, fieldValue] of Object.entries(appConfigFields)) {
    if (fieldValue !== undefined) {
      const [existingField] = await db.query(
        `SELECT * FROM app_config WHERE field_name = ? AND added_by = ?`,
        [fieldName, userId]
      );

      if (existingField.length > 0) {
        await db.query(
          `UPDATE app_config 
           SET field_value = ?, updated_on = NOW(), updated_by = ? 
           WHERE field_name = ?`,
          [fieldValue, userId, fieldName]
        );
      } else {
        await db.query(
          `INSERT INTO app_config (field_name, field_value, status, added_on, added_by, updated_on, updated_by) 
           VALUES (?, ?, 'active', NOW(), ?, NOW(), ?)`,
          [fieldName, fieldValue, userId, userId]
        );
      }
    }
  }
};

module.exports = {
  register,
  logout,
  updateUserProfile,
  forgotPassword,
  login,
  updateStoreProfile,
  resetPassword,
  getProfile,
  getStoreProfile,
};
