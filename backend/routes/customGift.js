const express = require('express');
const router = express.Router();
const CustomGift = require('../models/CustomGift');

// POST /api/custom-gift-request
router.post('/', async (req, res) => {
  try {
    const { name, email, description } = req.body;
    const newGift = new CustomGift({ name, email, description });
    await newGift.save();
    res.status(201).json({ message: 'Custom gift saved successfully!' });
  } catch (err) {
    console.error('Error saving custom gift:', err);
    res.status(500).json({ message: 'Failed to save custom gift' });
  }
});

module.exports = router;
