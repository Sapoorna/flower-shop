const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ["Flower", "Gift", "Cafe", "Other"], required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 9999 },
  imageUrl: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
