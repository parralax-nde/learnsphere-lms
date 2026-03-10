const userStore = require("../models/userStore");
const { validateProfile } = require("../validators/profileValidator");

/**
 * GET /api/users/:id
 * Returns the public profile of the specified user.
 * Users may only view their own profile unless they are an admin.
 */
function getProfile(req, res) {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  const user = userStore.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const { ...profile } = user;
  return res.status(200).json({ user: profile });
}

/**
 * PUT /api/users/:id
 * Updates the profile of the specified user.
 * Users may only update their own profile unless they are an admin.
 */
function updateProfile(req, res) {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  const { error, value } = validateProfile(req.body);
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(422).json({ message: "Validation failed.", errors });
  }

  const updated = userStore.updateProfile(id, value);
  if (!updated) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({
    message: "Profile updated successfully.",
    user: updated,
  });
}

module.exports = { getProfile, updateProfile };
