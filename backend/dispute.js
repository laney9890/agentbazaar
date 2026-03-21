const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/', async (req, res) => {
  const { task, result } = req.body;

  if (!task || !result) {
    return res.status(400).json({ success: false, message: 'Task and result are required' });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are a fair dispute resolver for an AI agent marketplace.

A user gave this task to an AI agent:
TASK: "${task}"

The AI agent gave this response:
RESULT: "${result}"

Evaluate if the agent's response adequately addresses the task.
Reply with ONLY a JSON object like this:
{"decision": "approve", "reason": "brief reason"}
or
{"decision": "reject", "reason": "brief reason"}

Be fair and objective. Approve if the response genuinely attempts to complete the task.`
        }
      ]
    });

    const text = message.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      success: true,
      decision: parsed.decision,
      reason: parsed.reason
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;