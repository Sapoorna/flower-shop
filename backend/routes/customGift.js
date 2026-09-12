const router = require('express').Router();
const Gift = require('../models/customGift');
const { text, email } = require('../lib/security');
router.post('/', async (req, res) => {
  await Gift.create({
    name: text(req.body.name, 'name', 2, 100),
    email: email(req.body.email),
    description: text(req.body.description, 'request details', 10, 2000)
  });
  res.status(201).json({ message: 'Your request has been received. We will reply by email.' });
});
module.exports = router;
