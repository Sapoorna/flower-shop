const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  // ✅ Add user reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      productId: { type: String, required: true },
      quantity: { type: Number, default: 1, min: 1 }
    }
  ],
  totalPrice: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String },
  status: { 
    type: String, 
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], 
    default: "Pending" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);