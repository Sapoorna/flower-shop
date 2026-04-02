const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  products: [
    {
      productId: { type: mongoose.Schema.Types.String, required: true }, // store product id string
      quantity: { type: Number, default: 1, min: 1 }
    }
  ],
  totalPrice: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String },
  status: { type: String, enum: ["Pending","Completed","Cancelled"], default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
