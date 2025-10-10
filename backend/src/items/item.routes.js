const express = require("express");
const {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getInventory,
} = require("./item.controller");

const router = express.Router();

// Item routes - CORRECT ORDER
// Specific routes must come BEFORE dynamic routes
router.post("/save", saveItem);
router.get("/", getAllItems);
router.get("/inventory", getInventory); // GET inventory - SPECIFIC ROUTE
router.post("/inventory", getInventory); // POST inventory - SPECIFIC ROUTE
router.put("/update", updateItem);
router.post("/delete", deleteItem);
// DYNAMIC ROUTES MUST COME LAST
router.get("/:id", getItem); // Dynamic route - COMES LAST
router.delete("/:id", deleteItem); // Dynamic route - COMES LAST

module.exports = router;
