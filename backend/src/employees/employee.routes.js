const express = require("express");
const { authenticate } = require("../middleware/auth"); // ADD AUTH MIDDLEWARE
const {
  createEmployee,
  getCompanyEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  employeeLogin,
  getEmployeeProfile
} = require("./employee.controller");

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/login", employeeLogin); // Employee login (public)

// ==================== PROTECTED ROUTES ====================
// Apply authentication to all management routes
router.post("/register", authenticate, createEmployee); // ✅ SECURED: Create employee
router.get("/", authenticate, getCompanyEmployees);     // ✅ SECURED: Get company employees
router.get("/:id", authenticate, getEmployee);          // ✅ SECURED: Get specific employee

// ==================== ADDITIONAL PROTECTED ROUTES ====================
router.put("/:id", authenticate, updateEmployee);       // Update employee
router.delete("/:id", authenticate, deleteEmployee);    // Delete employee
router.get("/profile/me", authenticate, getEmployeeProfile); // Employee gets own profile

module.exports = router;