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
      businessHours,
    } = req.body;
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

    if (userUpdateQuery) {
      await db.query(`UPDATE users SET ${userUpdateQuery} WHERE user_id = ?`, [
        ...userUpdateValues,
        userId,
      ]);
    }

    storeUpdateFields = {
      store_name,
      phone,
      website,
      address,
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
    const [storeResult] = await db.query(
      "SELECT store_id FROM stores WHERE user_id = ?",
      [userId]
    );

    if (storeResult.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    const storeId = storeResult[0].store_id;
    if (businessHours) {
      const businessHoursData = JSON.parse(businessHours);

      const storeTimingsQuery = `
      INSERT INTO store_timings (
        store_id, mon_close, mon_start, mon_end, tue_close, tue_start, tue_end,
        wed_close, wed_start, wed_end, thur_close, thur_start, thur_end,
        fri_close, fri_start, fri_end, sat_close, sat_start, sat_end, sun_close, sun_start, sun_end, added_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mon_close = VALUES(mon_close), mon_start = VALUES(mon_start), mon_end = VALUES(mon_end),
        tue_close = VALUES(tue_close), tue_start = VALUES(tue_start), tue_end = VALUES(tue_end),
        wed_close = VALUES(wed_close), wed_start = VALUES(wed_start), wed_end = VALUES(wed_end),
        thur_close = VALUES(thur_close), thur_start = VALUES(thur_start), thur_end = VALUES(thur_end),
        fri_close = VALUES(fri_close), fri_start = VALUES(fri_start), fri_end = VALUES(fri_end),
        sat_close = VALUES(sat_close), sat_start = VALUES(sat_start), sat_end = VALUES(sat_end),
        sun_close = VALUES(sun_close), sun_start = VALUES(sun_start), sun_end = VALUES(sun_end),
        added_on = VALUES(added_on)
    `;

      const currentTimestamp = new Date();

      const timingsValues = [
        storeId,
        businessHoursData.Monday?.closed ? "Y" : "N",
        businessHoursData.Monday?.start || null,
        businessHoursData.Monday?.end || null,
        businessHoursData.Tuesday?.closed ? "Y" : "N",
        businessHoursData.Tuesday?.start || null,
        businessHoursData.Tuesday?.end || null,
        businessHoursData.Wednesday?.closed ? "Y" : "N",
        businessHoursData.Wednesday?.start || null,
        businessHoursData.Wednesday?.end || null,
        businessHoursData.Thursday?.closed ? "Y" : "N",
        businessHoursData.Thursday?.start || null,
        businessHoursData.Thursday?.end || null,
        businessHoursData.Friday?.closed ? "Y" : "N",
        businessHoursData.Friday?.start || null,
        businessHoursData.Friday?.end || null,
        businessHoursData.Saturday?.closed ? "Y" : "N",
        businessHoursData.Saturday?.start || null,
        businessHoursData.Saturday?.end || null,
        businessHoursData.Sunday?.closed ? "Y" : "N",
        businessHoursData.Sunday?.start || null,
        businessHoursData.Sunday?.end || null,
        currentTimestamp,
      ];

      await db.query(storeTimingsQuery, timingsValues);
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
    const resetLink = `${process.env.SITE_URL}/resetPassword?token=${resetToken}`;

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

    const [user] = await db.query(
      `SELECT 
        user_id, 
        user_name, 
        pwd,
        email, 
        user_role, 
        refferal_credits, 
        image 
      FROM users 
      WHERE user_id = ?`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [config] = await db.query(
      `SELECT field_name, field_value FROM app_config`
    );
    const configObj = config.reduce((acc, { field_name, field_value }) => {
      acc[field_name] = field_value;
      return acc;
    }, {});

    const userProfile = {
      user_id: user[0].user_id,
      fullName: user[0].user_name,
      pwd: user[0].pwd,
      email: user[0].email,
      user_role: user[0].user_role,
      referral_credits: user[0].refferal_credits,
      profile_image: user[0].image,
      coupen_code: configObj.coupen_code,
      coupen_amount: configObj.coupen_amount,
      support_email: configObj.support_email || null,
      signup_credits: configObj.signup_credits || null,
      signup_credits_expiry: configObj.signup_credits_expiry || null,
      product_admin_share: configObj.product_admin_share || null,
      send_signup_email: configObj.send_signup_email || null,
    };

    res.json({
      message: "Profile updated successfully",
      userProfile,
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
    console.log("🚀 ~ getStoreProfile ~ id:", id);

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
        u.image AS profile_image,
        st.mon_close, st.mon_start, st.mon_end,
        st.tue_close, st.tue_start, st.tue_end,
        st.wed_close, st.wed_start, st.wed_end,
        st.thur_close, st.thur_start, st.thur_end,
        st.fri_close, st.fri_start, st.fri_end,
        st.sat_close, st.sat_start, st.sat_end,
        st.sun_close, st.sun_start, st.sun_end
      FROM stores AS s
      JOIN users AS u ON s.user_id = u.user_id
      LEFT JOIN store_timings AS st ON s.store_id = st.store_id
      WHERE s.user_id = ? ORDER BY st.auto_id DESC LIMIT 1`,
      [id]
    );

    if (!result.length) {
      return res.status(404).json({ message: "Store not found" });
    }

    const store = result[0];

    const businessHours = {
      Monday: {
        closed: store.mon_close === "Y",
        start: store.mon_start,
        end: store.mon_end,
      },
      Tuesday: {
        closed: store.tue_close === "Y",
        start: store.tue_start,
        end: store.tue_end,
      },
      Wednesday: {
        closed: store.wed_close === "Y",
        start: store.wed_start,
        end: store.wed_end,
      },
      Thursday: {
        closed: store.thur_close === "Y",
        start: store.thur_start,
        end: store.thur_end,
      },
      Friday: {
        closed: store.fri_close === "Y",
        start: store.fri_start,
        end: store.fri_end,
      },
      Saturday: {
        closed: store.sat_close === "Y",
        start: store.sat_start,
        end: store.sat_end,
      },
      Sunday: {
        closed: store.sun_close === "Y",
        start: store.sun_start,
        end: store.sun_end,
      },
    };

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
      business_hours: businessHours,
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
      email,
      refferal_credits,
      supportEmail,
      signupCredits,
      signupCreditsExpiry,
      productAdminShare,
      sendSignupEmail,
      couponCode,
      couponAmount,
      pwd,
    } = req.body;
    const profileImage = req.file;
    console.log("🚀 ~ updateUserProfile ~ profileImage:", profileImage);

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

    if (email) {
      updateFields.push("email = ?");
      updateData.push(email);
    }

    if (profileImage) {
      updateFields.push("image = ?");
      updateData.push(profileImage.path);
    }

    if (refferal_credits !== undefined) {
      updateFields.push("refferal_credits = ?");
      updateData.push(refferal_credits);
    }

    if (pwd) {
      updateFields.push("pwd = ?");
      updateData.push(pwd);
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
      coupen_code: couponCode,
      coupen_amount: couponAmount,
    };
    console.log("🚀 ~ updateUserProfile ~ appConfigFields:", appConfigFields);

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
