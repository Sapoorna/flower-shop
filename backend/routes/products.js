const router = require('express').Router();
router.get('/', (req, res) => res.json(require('../lib/catalog').catalog));
module.exports = router;
