const jwt = require("jsonwebtoken");

const authMiddleware = (requiredRoles) => (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided or malformed token");
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token:", token);

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log("Token verification failed:", err.message);
        return res.status(401).json({ message: "Invalid token." });
      }

      req.user = decoded;
      console.log("Token decoded:", req.user);

      if (Array.isArray(requiredRoles)) {
        if (!requiredRoles.includes(req.user.role)) {
          console.log(
            `Access denied. Required one of these roles: ${requiredRoles}`
          );
          return res.status(403).json({
            message: `Access denied. This action requires one of these roles: ${requiredRoles.join(
              ", "
            )}`,
          });
        }
      } else {
        if (req.user.role !== requiredRoles) {
          console.log(`Access denied. Required role: ${requiredRoles}`);
          return res.status(403).json({
            message: `Access denied. This action requires ${requiredRoles} role.`,
          });
        }
      }

      next();
    });
  } catch (error) {
    console.error("Error in middleware:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = authMiddleware;
