const express = require("express");
const {
  signupAdmin,
  loginAdmin,
  updateUser,
  getUser,
  getAllUsers,
} = require("./user.controller");

const router = express.Router();

// User routes
router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);
router.post("/update", updateUser);
router.get("/:email", getUser);
router.get("/", getAllUsers);

module.exports = router;
