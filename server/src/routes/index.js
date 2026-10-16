const express = require('express');
const bugRoutes = require('./bugRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'propr-api',
    timestamp: new Date().toISOString(),
  });
});

router.use('/bugs', bugRoutes);
router.use('/users', userRoutes);

module.exports = router;
