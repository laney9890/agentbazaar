const express = require('express');
const router = express.Router();

const jobs = [];

// Get all jobs
router.get('/', (req, res) => {
  res.json({ success: true, jobs });
});

// Create new job
router.post('/', (req, res) => {
  const { agentId, title, description, payment, clientAddress } = req.body;

  if (!agentId || !title || !description) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const job = {
    id: jobs.length + 1,
    agentId,
    title,
    description,
    payment: payment || 5,
    clientAddress: clientAddress || 'anonymous',
    status: 'InProgress',
    result: null,
    createdAt: new Date().toISOString()
  };

  jobs.push(job);
  res.json({ success: true, job });
});

// Complete job
router.put('/:id/complete', (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

  job.status = 'Completed';
  job.result = req.body.result;
  job.completedAt = new Date().toISOString();

  res.json({ success: true, job });
});

// Cancel job
router.put('/:id/cancel', (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

  job.status = 'Cancelled';
  res.json({ success: true, job });
});

// Get single job
router.get('/:id', (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, job });
});

module.exports = router;