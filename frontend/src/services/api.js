const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Retrieves the stored JWT token (in a real app this would come from a
 * secure auth context; here we read from localStorage for simplicity).
 */
function getToken() {
  return localStorage.getItem("authToken");
}

/**
 * Fetch the profile of a user.
 * @param {string} userId
 * @returns {Promise<{ user: object }>}
 */
export async function fetchProfile(userId) {
  const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile.");
  }
  return data;
}

/**
 * Update the profile of a user.
 * @param {string} userId
 * @param {object} payload - { firstName, lastName, bio, phone, website }
 * @returns {Promise<{ message: string, user: object }>}
 */
export async function updateProfile(userId, payload) {
  const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Failed to update profile.");
    error.errors = data.errors || [];
    error.status = response.status;
    throw error;
  }
  return data;
}
