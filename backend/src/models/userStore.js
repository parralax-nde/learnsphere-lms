/**
 * In-memory user store.
 * In a production system, this would be replaced with a database ORM model.
 */

const users = new Map([
  [
    "user-001",
    {
      id: "user-001",
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      bio: "Passionate educator and lifelong learner.",
      phone: "+1-555-0100",
      website: "https://alice.example.com",
      createdAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-15T10:00:00.000Z",
    },
  ],
]);

/**
 * Find a user by ID.
 * @param {string} id
 * @returns {object|undefined}
 */
function findById(id) {
  return users.get(id);
}

/**
 * Update a user's profile fields.
 * @param {string} id
 * @param {object} fields - Allowed profile fields to update
 * @returns {object|null} Updated user or null if not found
 */
function updateProfile(id, fields) {
  const user = users.get(id);
  if (!user) return null;

  const updated = {
    ...user,
    ...fields,
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: new Date().toISOString(),
  };

  users.set(id, updated);
  return updated;
}

module.exports = { findById, updateProfile };
