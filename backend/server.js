const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/agents', require('./agents'));
app.use('/api/jobs', require('./jobs'));

app.get('/', (req, res) => {
  res.json({ message: 'AgentBazaar API is running!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AgentBazaar API running on port ${PORT}`);
});