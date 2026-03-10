import React, { useState, useEffect, useCallback } from "react";
import { fetchProfile, updateProfile } from "../../services/api";
import "./ProfileEdit.css";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  bio: "",
  phone: "",
  website: "",
};

/**
 * Client-side validation mirrors server-side rules so that users get
 * immediate feedback before a network request is made.
 */
function validateForm(values) {
  const errors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (values.firstName.trim().length > 50) {
    errors.firstName = "First name must not exceed 50 characters.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (values.lastName.trim().length > 50) {
    errors.lastName = "Last name must not exceed 50 characters.";
  }

  if (values.bio && values.bio.length > 500) {
    errors.bio = "Bio must not exceed 500 characters.";
  }

  if (values.phone && !/^\+?[\d\s\-().]{7,20}$/.test(values.phone)) {
    errors.phone =
      "Phone number is invalid. Use digits, spaces, hyphens, parentheses, or a leading +.";
  }

  if (values.website && !/^https?:\/\/.+\..+/.test(values.website)) {
    errors.website = "Website must be a valid URL (e.g., https://example.com).";
  }

  return errors;
}

/**
 * ProfileEdit component
 *
 * Displays an editable form for the authenticated user's personal information.
 * Provides clear success and error feedback, and mirrors server-side validation
 * on the client for a snappy user experience.
 *
 * Props:
 *   - userId {string} – ID of the user whose profile is being edited
 */
function ProfileEdit({ userId }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const loadProfile = useCallback(async () => {
    setFetchError("");
    setLoading(true);
    try {
      const { user } = await fetchProfile(userId);
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        bio: user.bio || "",
        phone: user.phone || "",
        website: user.website || "",
      });
    } catch (err) {
      setFetchError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId, loadProfile]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear individual field error as the user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setSuccessMessage("");
    setServerErrors([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccessMessage("");
    setServerErrors([]);

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { message } = await updateProfile(userId, form);
      setSuccessMessage(message || "Profile updated successfully.");
      setFieldErrors({});
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        setServerErrors(err.errors);
      } else {
        setServerErrors([err.message || "An unexpected error occurred."]);
      }
    } finally {
      setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <div className="profile-edit" role="alert" aria-live="assertive">
        <p className="profile-edit__error-banner">{fetchError}</p>
        <button
          className="profile-edit__retry-btn"
          onClick={loadProfile}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="profile-edit" aria-labelledby="profile-edit-heading">
      <h2 id="profile-edit-heading" className="profile-edit__heading">
        Edit Profile
      </h2>

      {successMessage && (
        <div
          className="profile-edit__success-banner"
          role="status"
          aria-live="polite"
          data-testid="success-message"
        >
          {successMessage}
        </div>
      )}

      {serverErrors.length > 0 && (
        <div
          className="profile-edit__error-banner"
          role="alert"
          aria-live="assertive"
          data-testid="server-errors"
        >
          <ul>
            {serverErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="profile-edit__form"
        onSubmit={handleSubmit}
        noValidate
        data-testid="profile-form"
      >
        <div className="profile-edit__row">
          <div className="profile-edit__field">
            <label htmlFor="firstName" className="profile-edit__label">
              First Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className={`profile-edit__input${fieldErrors.firstName ? " profile-edit__input--error" : ""}`}
              value={form.firstName}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
              maxLength={50}
              disabled={loading}
            />
            {fieldErrors.firstName && (
              <span
                id="firstName-error"
                className="profile-edit__field-error"
                role="alert"
                data-testid="firstName-error"
              >
                {fieldErrors.firstName}
              </span>
            )}
          </div>

          <div className="profile-edit__field">
            <label htmlFor="lastName" className="profile-edit__label">
              Last Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className={`profile-edit__input${fieldErrors.lastName ? " profile-edit__input--error" : ""}`}
              value={form.lastName}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
              maxLength={50}
              disabled={loading}
            />
            {fieldErrors.lastName && (
              <span
                id="lastName-error"
                className="profile-edit__field-error"
                role="alert"
                data-testid="lastName-error"
              >
                {fieldErrors.lastName}
              </span>
            )}
          </div>
        </div>

        <div className="profile-edit__field">
          <label htmlFor="bio" className="profile-edit__label">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            className={`profile-edit__textarea${fieldErrors.bio ? " profile-edit__input--error" : ""}`}
            value={form.bio}
            onChange={handleChange}
            rows={4}
            maxLength={500}
            aria-describedby={fieldErrors.bio ? "bio-error" : "bio-hint"}
            disabled={loading}
          />
          <span id="bio-hint" className="profile-edit__hint">
            {form.bio.length}/500 characters
          </span>
          {fieldErrors.bio && (
            <span
              id="bio-error"
              className="profile-edit__field-error"
              role="alert"
              data-testid="bio-error"
            >
              {fieldErrors.bio}
            </span>
          )}
        </div>

        <div className="profile-edit__field">
          <label htmlFor="phone" className="profile-edit__label">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={`profile-edit__input${fieldErrors.phone ? " profile-edit__input--error" : ""}`}
            value={form.phone}
            onChange={handleChange}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            placeholder="+1-555-0100"
            disabled={loading}
          />
          {fieldErrors.phone && (
            <span
              id="phone-error"
              className="profile-edit__field-error"
              role="alert"
              data-testid="phone-error"
            >
              {fieldErrors.phone}
            </span>
          )}
        </div>

        <div className="profile-edit__field">
          <label htmlFor="website" className="profile-edit__label">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            className={`profile-edit__input${fieldErrors.website ? " profile-edit__input--error" : ""}`}
            value={form.website}
            onChange={handleChange}
            aria-describedby={fieldErrors.website ? "website-error" : undefined}
            placeholder="https://example.com"
            disabled={loading}
          />
          {fieldErrors.website && (
            <span
              id="website-error"
              className="profile-edit__field-error"
              role="alert"
              data-testid="website-error"
            >
              {fieldErrors.website}
            </span>
          )}
        </div>

        <div className="profile-edit__actions">
          <button
            type="submit"
            className="profile-edit__submit-btn"
            disabled={loading}
            data-testid="submit-button"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfileEdit;
