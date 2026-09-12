const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
      {
        productId: { type: String, required: true },
        name: String,
        unitPrice: Number,
        quantity: { type: Number, min: 1, max: 20 },
        image: String
      }
    ],
    subtotal: Number,
    deliveryFee: Number,
    totalPrice: { type: Number, required: true, min: 0 },
    currency: String,
    customerName: { type: String, required: true },
    customerEmail: String,
    customerPhone: String,
    address: { line: String, city: String, postalCode: String },
    note: { type: String, maxlength: 500 },
    paymentMethod: { type: String, enum: ['cod'] },
    paymentStatus: { type: String, default: 'Unpaid' },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    requestKey: String
  },
  { timestamps: true }
);
schema.index(
  { userId: 1, requestKey: 1 },
  { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } } }
);
module.exports = mongoose.model('Order', schema);
