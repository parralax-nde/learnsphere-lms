const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "learnsphere-dev-secret";

/**
 * Middleware that verifies the Bearer JWT token in the Authorization header.
 * The decoded payload is attached to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = { authenticate };
