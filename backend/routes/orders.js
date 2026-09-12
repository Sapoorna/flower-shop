const router = require('express').Router();
const Order = require('../models/Order');
const { authMiddleware } = require('../middleware/auth');
const { text, rateLimit } = require('../lib/security');
const { quote } = require('../lib/catalog');
router.use(authMiddleware);
router.get('/', async (req, res) =>
  res.json(await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100))
);
router.post('/', rateLimit(20, 3600000), async (req, res) => {
  if (req.body.paymentMethod !== 'cod')
    return res.status(400).json({ message: 'Only cash on delivery is currently available.' });
  const requestKey = text(req.body.requestKey, 'order reference', 16, 80);
  const existing = await Order.findOne({ userId: req.userId, requestKey });
  if (existing) return res.json(existing);
  const total = quote(req.body.products);
  const phone = text(req.body.customerPhone, 'Sri Lankan phone number', 9, 20);
  if (!/^(?:\+94|0)[0-9\s-]{8,13}$/.test(phone))
    return res
      .status(400)
      .json({ message: 'Enter a Sri Lankan phone number, starting with 0 or +94.' });
  const address = {
    line: text(req.body.address?.line, 'street address', 5, 200),
    city: text(req.body.address?.city, 'city', 2, 80),
    postalCode: text(req.body.address?.postalCode, 'postal code', 5, 5)
  };
  if (!/^\d{5}$/.test(address.postalCode))
    return res.status(400).json({ message: 'Enter a five-digit postal code.' });
  const data = {
    ...total,
    userId: req.userId,
    requestKey,
    customerName: text(req.body.customerName, 'recipient name', 2, 120),
    customerEmail: req.user.email,
    customerPhone: phone,
    address,
    note: text(req.body.note || '', 'delivery note', 0, 500),
    paymentMethod: 'cod'
  };
  try {
    res.status(201).json(await Order.create(data));
  } catch (e) {
    if (e.code === 11000) {
      const prior = await Order.findOne({ userId: req.userId, requestKey });
      if (prior) return res.json(prior);
    }
    throw e;
  }
});
module.exports = router;
