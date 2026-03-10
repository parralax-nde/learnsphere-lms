const { verifyAccessToken } = require('./jwtUtils');

/**
 * Middleware to authenticate requests via Bearer JWT token.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to restrict access to instructors (and admins).
 */
const requireInstructor = (req, res, next) => {
  if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Instructor access required' });
  }
  next();
};

module.exports = { authenticate, requireInstructor };
