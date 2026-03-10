const Joi = require("joi");

const profileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "First name is required.",
    "string.min": "First name must be at least 1 character.",
    "string.max": "First name must not exceed 50 characters.",
    "any.required": "First name is required.",
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Last name is required.",
    "string.min": "Last name must be at least 1 character.",
    "string.max": "Last name must not exceed 50 characters.",
    "any.required": "Last name is required.",
  }),
  bio: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Bio must not exceed 500 characters.",
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base":
        "Phone number is invalid. Use digits, spaces, hyphens, parentheses, or a leading +.",
    }),
  website: Joi.string().trim().uri().allow("").optional().messages({
    "string.uri": "Website must be a valid URL (e.g., https://example.com).",
  }),
});

/**
 * Validate profile update payload.
 * @param {object} data
 * @returns {{ error: Joi.ValidationError|undefined, value: object }}
 */
function validateProfile(data) {
  return profileSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

module.exports = { validateProfile };
