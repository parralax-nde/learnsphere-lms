const express = require("express");
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../middleware/auth");
const { getProfile, updateProfile } = require("../controllers/userController");

const router = express.Router();

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

router.get("/:id", profileLimiter, authenticate, getProfile);
router.put("/:id", profileLimiter, authenticate, updateProfile);

module.exports = router;
