const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseMessage(userMessage, userPhone) {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const currentMinute = istTime.getMinutes();
  const currentHour = istTime.getHours();
  const currentDay = istTime.getDate();
  const currentMonth = istTime.getMonth() + 1;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are a reminder bot assistant. Parse the user's WhatsApp message and return a JSON object.

Current IST time: ${currentHour}:${String(currentMinute).padStart(2, '0')} on ${currentDay}/${currentMonth}

User message: "${userMessage}"

Return ONLY valid JSON, no explanation, no markdown:

For creating a reminder:
{"action":"create","message":"the reminder message in user's language","frequency":"once|daily|weekly|monthly","cron":"cron expression","reply":"confirmation in same language as user"}

For listing reminders:
{"action":"list","reply":"confirmation in same language as user"}

For deleting:
{"action":"delete","target":"which reminder","reply":"confirmation in same language as user"}

For delete all:
{"action":"delete_all","reply":"confirmation in same language as user"}

For pause:
{"action":"pause","reply":"confirmation in same language as user"}

For resume:
{"action":"resume","reply":"confirmation in same language as user"}

For unknown:
{"action":"unknown","reply":"friendly message in same language as user explaining what RemindMe can do with 3 examples"}

CRON EXPRESSION RULES - very important:
- Format is: minute hour day month weekday
- For "in X minutes": add X to current minute ${currentMinute}, handle hour overflow. Example: "in 2 minutes" at 14:30 = "32 14 * * *"
- For "in X hours": add X to current hour ${currentHour}. Example: "in 2 hours" at 14:30 = "30 16 * * *"
- For "daily at X": use "0 X * * *"
- For "every morning at 8": use "0 8 * * *"
- For "every monday": use "0 9 * * 1"
- For one-time reminders always include the exact day ${currentDay} and month ${currentMonth}
- NEVER return "* * * * *" — always calculate exact values

LANGUAGE RULES - very important:
- Detect the language of the user's message (Hindi, English, Hinglish)
- Reply and message fields must be in the SAME language as the user
- If user wrote in Hinglish, reply in Hinglish
- If user wrote in Hindi, reply in Hindi
- If user wrote in English, reply in English`
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

Keep it under 40 words. Be warm and encouraging. Add a relevant emoji.
Never start with "Reminder:" — make it feel personal and human.
IMPORTANT: Write in the SAME language as the reminder message. If the reminder is in Hindi or Hinglish, respond in Hinglish. If English, respond in English.
Return only the message text, nothing else.`
      }
    ]
  });

  return response.content[0].text.trim();
}

module.exports = { parseMessage, generateReminderMessage };
