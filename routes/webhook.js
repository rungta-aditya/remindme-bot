const express = require("express");
const router = express.Router();
const { parseMessage, generateReminderMessage } = require("../services/nlp");
const { sendMessage } = require("../services/whatsapp");
const { createPaymentLink } = require("../services/razorpay");
const db = require("../services/db");
const { scheduleReminder } = require("../scheduler");

router.post("/whatsapp", async (req, res) => {
  res.sendStatus(200); // Respond to Twilio immediately

  const from = req.body.From; // e.g. whatsapp:+919999999999
  const body = req.body.Body?.trim();
  const phone = from.replace("whatsapp:", "");

  if (!body) return;

  try {
    await db.getOrCreateUser(phone);
    const parsed = await parseMessage(body, phone);

    if (parsed.action === "create") {
      const { allowed, user } = await db.canCreateReminder(phone);

      if (!allowed) {
        const payLink = await createPaymentLink(phone);
        await sendMessage(from,
          `You've used all 5 free reminders this month 🙈\n\nUpgrade to *RemindMe Pro* for ₹99/month — unlimited reminders + AI-generated messages.\n\nPay here 👉 ${payLink}\n\nReply *DONE* after paying and I'll activate your account instantly!`
        );
        return;
      }

      await db.createReminder(phone, parsed.message, parsed.frequency, parsed.cron);
      scheduleReminder({ user_phone: phone, message: parsed.message, cron_expression: parsed.cron, frequency: parsed.frequency });
      await sendMessage(from, parsed.reply);

    } else if (parsed.action === "list") {
      const reminders = await db.getUserReminders(phone);
      if (!reminders.length) {
        await sendMessage(from, "You have no active reminders. Send me something like:\n\n_'Remind me every morning at 8am to drink water'_ 💧");
      } else {
        const list = reminders.map((r, i) => `${i + 1}. ${r.message} (${r.frequency})`).join("\n");
        await sendMessage(from, `Your active reminders 📋\n\n${list}\n\nTo delete one, say _'delete my water reminder'_`);
      }

    } else if (parsed.action === "delete") {
      const deleted = await db.deleteReminderByDescription(phone, parsed.target);
      await sendMessage(from, deleted ? `Done! Deleted your reminder for "${deleted.message}" ✅` : "Couldn't find that reminder. Say *list* to see all your reminders.");

    } else if (parsed.action === "delete_all") {
      await db.deleteAllReminders(phone);
      await sendMessage(from, parsed.reply);

    } else if (parsed.action === "pause") {
      await db.pauseAllReminders(phone);
      await sendMessage(from, parsed.reply);

    } else if (parsed.action === "resume") {
      await db.resumeAllReminders(phone);
      await sendMessage(from, parsed.reply);

    } else if (body.toLowerCase() === "done") {
      // User says DONE after payment — check and upgrade
      await sendMessage(from, "Checking your payment... give me a second ⏳\n\nIf you've paid, your account will be upgraded within a minute. If not, reply with the payment link again.");

    } else {
      await sendMessage(from, parsed.reply);
    }

  } catch (err) {
    console.error("Webhook error:", err);
    await sendMessage(from, "Oops, something went wrong on my end 😅 Try again in a moment!");
  }
});

// Razorpay payment confirmation webhook
router.post("/razorpay", async (req, res) => {
  res.sendStatus(200);

  try {
    const event = req.body.event;
    if (event === "payment_link.paid") {
      const phone = req.body.payload?.payment_link?.entity?.notes?.phone;
      if (phone) {
        await db.upgradeUser(phone);
        await sendMessage(`whatsapp:${phone}`,
          "🎉 Payment confirmed! You're now on *RemindMe Pro* — unlimited reminders activated!\n\nTry setting a new reminder now. What would you like to be reminded about?"
        );
      }
    }
  } catch (err) {
    console.error("Razorpay webhook error:", err);
  }
});

module.exports = router;
