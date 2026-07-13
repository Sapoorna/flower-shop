require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI;

async function clearProducts() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    await Product.deleteMany({});
    console.log('✅ All products cleared successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error clearing products:', err.message);
    process.exit(1);
  }
}

clearProducts();
