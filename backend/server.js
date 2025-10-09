// ----- Required imports -----
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

const app = express();


// connect to MongoDB
connectDB();


// middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "50kb" }));


// api routes
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");


app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/custom-gift-request', require('./routes/customGift'));



// Serve frontend static files from backend/public
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));


// Fallback: if request isn't for /api, serve index.html (SPA-friendly)
// Fallback: serve index.html for any non-API route (Express 5 syntax)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));