const express = require("express");
const {
  updateCompany,
  getCompany,
  updateCompanyPassword,
} = require("../controllers/companyController");

const router = express.Router();

// Company routes
router.post("/update", updateCompany);
router.post("/update-password", updateCompanyPassword);
router.get("/:companyCode", getCompany);

module.exports = router;
