const express = require("express");
const { authenticate } = require("../middleware/auth"); // Only import authenticate
const {
  signupAdmin,
  loginAdmin,
  updateUser,
  getUser,
  getAllUsers,
  getCurrentUser,
  deleteUser
} = require("./user.controller");

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);

// ==================== PROTECTED ROUTES ====================
router.get("/", authenticate, getAllUsers);
router.get("/profile/me", authenticate, getCurrentUser);
router.get("/:email", authenticate, getUser);
router.post("/update", authenticate, updateUser);
router.delete("/:email", authenticate, deleteUser); // DELETE route
router.post("/delete", authenticate, deleteUser);   // POST route for flexibility

module.exports = router;