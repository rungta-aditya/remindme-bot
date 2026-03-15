const twilio = require("twilio");

async function sendMessage(to, message) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  await client.messages.create({
    from,
    to: formattedTo,
    body: message
  });
}

module.exports = { sendMessage };