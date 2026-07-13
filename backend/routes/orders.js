const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { authMiddleware } = require("../middleware/auth");

// ✅ GET all orders (only user's own orders)
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Only get orders for the logged-in user
    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST create new order (associate with user)
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("Received order data:", req.body);
    
    const { products, totalPrice, customerName, customerEmail, customerPhone } = req.body;
    
    // Validate
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required and cannot be empty" });
    }
    
    if (totalPrice === undefined || totalPrice === null) {
      return res.status(400).json({ message: "Total price is required" });
    }
    
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ message: "Customer name is required" });
    }

    // ✅ Create order with userId
    const order = new Order({
      userId: req.userId,  // ✅ Associate with logged-in user
      products: products.map(p => ({
        productId: p.productId || p.id || "unknown",
        quantity: p.quantity || 1
      })),
      totalPrice,
      customerName: customerName.trim(),
      customerEmail: customerEmail || req.user.email, // Use user's email if not provided
      customerPhone: customerPhone || "",
      status: "Pending"
    });

    const savedOrder = await order.save();
    console.log("Order saved successfully:", savedOrder._id);
    
    res.status(201).json(savedOrder);
    
  } catch (err) {
    console.error("Order creation error:", err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: "Validation failed", errors });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid data format" });
    }
    
    res.status(500).json({ 
      message: "Server error creating order",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;