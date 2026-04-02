const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// GET all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new order (IMPROVED ERROR HANDLING)
router.post("/", async (req, res) => {
  try {
    console.log("Received order data:", req.body);
    
    // Validate required fields
    const { products, totalPrice, customerName } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required and cannot be empty" });
    }
    
    if (totalPrice === undefined || totalPrice === null) {
      return res.status(400).json({ message: "Total price is required" });
    }
    
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ message: "Customer name is required" });
    }

    // Create and save order
    const order = new Order({
      products: products.map(p => ({
        productId: p.productId || p.id || "unknown", // Handle different ID fields
        quantity: p.quantity || 1
      })),
      totalPrice,
      customerName: customerName.trim(),
      customerEmail: req.body.customerEmail || "",
      customerPhone: req.body.customerPhone || "",
      status: "Pending"
    });

    const savedOrder = await order.save();
    console.log("Order saved successfully:", savedOrder._id);
    
    res.status(201).json(savedOrder);
    
  } catch (err) {
    console.error("Order creation error:", err);
    
    // More specific error messages
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid data format" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error creating order",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;