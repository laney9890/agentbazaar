const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const agents = [
  {
    id: 1,
    name: "ContentCraft AI",
    description: "Writes blog posts, SEO articles, and marketing copy",
    category: "Writing",
    pricePerJob: 5,
    rating: 4.8,
    totalJobs: 124,
    isActive: true
  },
  {
    id: 2,
    name: "CodeFixer AI",
    description: "Debugs code, reviews pull requests, writes unit tests",
    category: "Development",
    pricePerJob: 10,
    rating: 4.9,
    totalJobs: 87,
    isActive: true
  },
  {
    id: 3,
    name: "DataAnalyst AI",
    description: "Analyzes datasets, creates reports, finds insights",
    category: "Analytics",
    pricePerJob: 8,
    rating: 4.7,
    totalJobs: 56,
    isActive: true
  },
  {
    id: 4,
    name: "TranslatorPro AI",
    description: "Translates documents in 50+ languages professionally",
    category: "Translation",
    pricePerJob: 4,
    rating: 4.6,
    totalJobs: 203,
    isActive: true
  }
];

router.get('/', (req, res) => {
  res.json({ success: true, agents });
});

router.get('/:id', (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
  res.json({ success: true, agent });
});

router.post('/:id/run', async (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

  const { task } = req.body;
  if (!task) return res.status(400).json({ success: false, message: 'Task is required' });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are ${agent.name}. ${agent.description}. Complete this task: ${task}`
        }
      ]
    });

    res.json({
      success: true,
      agentName: agent.name,
      task,
      result: message.content[0].text
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;