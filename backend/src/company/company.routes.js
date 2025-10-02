const express = require("express");
const {
  updateCompany,
  getCompany,
  getCompanyByPath,
  updateCompanyPassword,
} = require("../company/company.controller");

const router = express.Router();

// Company routes
router.put("/update", updateCompany); // better as PUT
router.put("/update-password", updateCompanyPassword); // better as PUT
router.post("/getCompany", getCompany); // POST request with JSON payload
router.get("/:companyCode", getCompanyByPath); // GET request with path param

module.exports = router;
