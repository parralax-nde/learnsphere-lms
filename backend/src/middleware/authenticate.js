import { verifyToken } from './jwtUtils.js';

/**
 * Middleware: require a valid Bearer access token.
 * Attaches the decoded payload to req.user.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Middleware factory: require the authenticated user to have one of the given roles.
 * Must be used after authenticate().
 * @param {...string} roles - e.g. requireRole('ADMIN') or requireRole('INSTRUCTOR', 'ADMIN')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}
