const { verifyAccessToken } = require('./jwtUtils');

/**
 * Express middleware that authenticates requests using a Bearer access token.
 *
 * On success, attaches the decoded payload to `req.user`.
 * On failure, responds with 401 Unauthorized.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token has expired.' });
    }
    if (err.code === 'TOKEN_REVOKED') {
      return res.status(401).json({ message: 'Token has been revoked.' });
    }
    return res.status(401).json({ message: 'Invalid access token.' });
  }
}

module.exports = { authenticate };
