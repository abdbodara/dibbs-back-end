const { db } = require("../db/config");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password, and role are required.",
      });
    }

    const query = "SELECT * FROM users WHERE email = ? AND user_role = ?";
    const [results] = await db.query(query, [email, role]);

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
      retData.message = "Email not found or user is inactive.";
      return res.status(404).json(retData);
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

  try {
    const decodedEmail = Buffer.from(token, "base64").toString("utf-8");

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND status = ?",
      [decodedEmail, "active"]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ error: "User not found or account is inactive" });
    }

    const user = rows[0];

    await db.query("UPDATE users SET pwd = ? WHERE email = ?", [
      password,
      decodedEmail,
    ]);

    res.status(200).json({ success: "Password successfully updated" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    console.log(id, "id");
    const [user] = await db.query(
      "SELECT user_id, fullName, email, user_role, referral_credits, support_email, signup_credits, signup_credits_expiry, product_admin_share, send_signup_email, image, coupon_code, coupon_amount FROM users WHERE user_id = ?",
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user_id: user[0].user_id,
      fullName: user[0].fullName,
      email: user[0].email,
      user_role: user[0].user_role,
      referral_credits: user[0].referral_credits,
      support_email: user[0].support_email,
      signup_credits: user[0].signup_credits,
      signup_credits_expiry: user[0].signup_credits_expiry,
      product_admin_share: user[0].product_admin_share,
      send_signup_email: user[0].send_signup_email,
      profile_image: user[0].image,
      coupon_code: user[0].coupon_code,
      coupon_amount: user[0].coupon_amount,
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
      fullName,
      referralCredits,
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
    console.log("🚀 ~ updateUserProfile ~ user:", user);
    if (!user.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const updateFields = [];
    const updateData = [];

    if (fullName) {
      updateFields.push("fullName = ?");
      updateData.push(fullName);
    }

    if (referralCredits !== undefined) {
      updateFields.push("referral_credits = ?");
      updateData.push(referralCredits);
    }

    if (supportEmail !== undefined) {
      updateFields.push("support_email = ?");
      updateData.push(supportEmail);
    }

    if (signupCredits !== undefined) {
      updateFields.push("signup_credits = ?");
      updateData.push(signupCredits);
    }

    if (signupCreditsExpiry !== undefined) {
      updateFields.push("signup_credits_expiry = ?");
      updateData.push(signupCreditsExpiry);
    }

    if (productAdminShare !== undefined) {
      updateFields.push("product_admin_share = ?");
      updateData.push(productAdminShare);
    }

    if (sendSignupEmail !== undefined) {
      updateFields.push("send_signup_email = ?");
      updateData.push(sendSignupEmail);
    }

    if (couponCode !== undefined) {
      updateFields.push("coupon_code = ?");
      updateData.push(couponCode);
    }

    if (couponAmount !== undefined) {
      updateFields.push("coupon_amount = ?");
      updateData.push(couponAmount);
    }

    if (profileImage) {
      updateFields.push("image = ?");
      updateData.push(profileImage);
    }

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

    console.log(
      "🚀 ~ updateUserProfile ~ updateFields:",
      updateFields,
      updateData
    );

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
  console.log("🚀 ~ updateAppConfig ~ userId:", userId);
  for (const [fieldName, fieldValue] of Object.entries(appConfigFields)) {
    if (fieldValue !== undefined) {
      const [existingField] = await db.query(
        `SELECT * FROM app_config WHERE field_name = ? AND added_by = ?`,
        [fieldName, userId]
      );

      if (existingField.length > 0) {
        console.log("🚀 ~ updateAppConfig ~ existingField:", existingField);
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
  logout,
  updateUserProfile,
  forgotPassword,
  login,
  resetPassword,
  getProfile,
};
