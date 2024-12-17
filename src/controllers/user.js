const { db } = require("../db/config");
const jwt = require("jsonwebtoken");

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

    console.log("🚀 ~ login ~ results:", results);

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials or user not found.",
      });
    }

    const user = results[0];
    console.log("🚀 ~ login ~ user:", user);

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
      user_name: user.user_name,
      role: user.user_role,
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
    } = req.body;

    const profileImage = req.file ? req.file.filename : null;

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
      updateFields.push("user_name = ?");
      updateData.push(fullName);
    }

    if (referralCredits) {
      updateFields.push("refferal_credits = ?");
      updateData.push(referralCredits);
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

module.exports = { logout, updateUserProfile, login };
