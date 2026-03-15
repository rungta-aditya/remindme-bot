const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseMessage(userMessage, userPhone) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are a reminder bot assistant. Parse the user's WhatsApp message and return a JSON object.

User message: "${userMessage}"

Return ONLY valid JSON, no explanation, no markdown. Use this structure:

For creating a reminder:
{"action":"create","message":"the reminder message","frequency":"once|daily|weekly|monthly","cron":"cron expression","reply":"confirmation message to send user"}

For listing reminders:
{"action":"list","reply":"I'll fetch your reminders now"}

For deleting a reminder:
{"action":"delete","target":"description of which reminder to delete","reply":"confirmation"}

For deleting all reminders:
{"action":"delete_all","reply":"confirmation"}

For pausing all:
{"action":"pause","reply":"confirmation"}

For resuming all:
{"action":"resume","reply":"confirmation"}

For unrecognised messages:
{"action":"unknown","reply":"friendly message explaining what RemindMe can do, with 3 example commands"}

Rules:
- cron expressions must be valid 5-part cron (min hour day month weekday)
- Default timezone is Asia/Kolkata (IST)
- For "in X minutes/hours" use a one-time reminder (frequency: once)
- Keep reply messages friendly, concise, under 100 words
- reply should confirm what was set e.g. "Got it! I'll remind you every day at 8am to drink water 💧"
- For unknown messages be helpful and show examples`
      }
    ]
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function generateReminderMessage(originalMessage) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Generate a short, friendly, motivational WhatsApp reminder message for: "${originalMessage}". 
        
Keep it under 50 words. Be warm and encouraging. Add a relevant emoji. 
Never start with "Reminder:" — make it feel personal and human.
Return only the message text, nothing else.`
      }
    ]
  });

  return response.content[0].text.trim();
}

module.exports = { parseMessage, generateReminderMessage };
