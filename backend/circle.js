const express = require('express');
const router = express.Router();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_BASE_URL = 'https://api-sandbox.circle.com/v1';

// Circle API'ye istek at
async function circleRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${CIRCLE_BASE_URL}${endpoint}`, options);
  return res.json();
}

// USDC bakiyesi sorgula
router.get('/balance/:address', async (req, res) => {
  try {
    const data = await circleRequest('GET', `/wallets`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Transfer bilgisi al
router.get('/transfer/:id', async (req, res) => {
  try {
    const data = await circleRequest('GET', `/transfers/${req.params.id}`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Nanopayment kaydı oluştur
router.post('/nanopayment', async (req, res) => {
  const { agentId, task, amount, streamId, txHash } = req.body;
  try {
    // Ödeme kaydını logla
    console.log(`Nanopayment: Agent ${agentId}, Amount ${amount} USDC, Stream ${streamId}, TX ${txHash}`);
    res.json({ 
      success: true, 
      message: 'Nanopayment recorded',
      payment: { agentId, task, amount, streamId, txHash, timestamp: new Date().toISOString() }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;