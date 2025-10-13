const express = require("express");
const multer = require("multer");
const {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getInventory,
} = require("./item.controller");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for ImageKit
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// 🔥 FIXED: Add multer middleware to the save route
router.post("/save", upload.single("file"), saveItem); // ← ADD THIS
router.get("/", getAllItems);
router.get("/inventory", getInventory);
router.post("/inventory", getInventory);
router.put("/update", updateItem);
router.post("/delete", deleteItem);
router.get("/:id", getItem);
router.delete("/:id", deleteItem);

module.exports = router;
