const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createPaymentLink(phone) {
  const paymentLink = await razorpay.paymentLink.create({
    amount: 9900, // ₹99 in paise
    currency: "INR",
    description: "RemindMe Pro — unlimited reminders",
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { phone },
    callback_url: `${process.env.APP_URL}/webhook/razorpay-confirm`,
    callback_method: "get"
  });

  return paymentLink.short_url;
}

async function verifyWebhook(body, signature) {
  const crypto = require("crypto");
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");

  return expected === signature;
}

module.exports = { createPaymentLink, verifyWebhook };
