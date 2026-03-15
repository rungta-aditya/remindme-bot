const cron = require("node-cron");
const { sendMessage } = require("./services/whatsapp");
const { generateReminderMessage } = require("./services/nlp");
const db = require("./services/db");

const activeTasks = new Map();

function scheduleReminder(reminder) {
  const { id, user_phone, message, cron_expression, frequency } = reminder;
  const key = id || `${user_phone}-${message}`;

  // Cancel existing task if any
  if (activeTasks.has(key)) {
    activeTasks.get(key).stop();
    activeTasks.delete(key);
  }

  if (!cron.validate(cron_expression)) {
    console.error(`Invalid cron expression: ${cron_expression}`);
    return;
  }

  const task = cron.schedule(cron_expression, async () => {
    try {
      // Check if reminder is still active
      const reminders = await db.getUserReminders(user_phone);
      const still_active = reminders.find(r => r.message === message);
      if (!still_active) {
        task.stop();
        activeTasks.delete(key);
        return;
      }

      // Generate fresh AI message
      const aiMessage = await generateReminderMessage(message);
      await sendMessage(`whatsapp:${user_phone}`, aiMessage);

      // If one-time reminder, deactivate after firing
      if (frequency === "once") {
        await db.deleteReminderByDescription(user_phone, message);
        task.stop();
        activeTasks.delete(key);
      }
    } catch (err) {
      console.error(`Failed to fire reminder for ${user_phone}:`, err.message);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  activeTasks.set(key, task);
  console.log(`Scheduled reminder for ${user_phone}: "${message}" at ${cron_expression}`);
}

// On server start, reload all active reminders from DB
async function reloadReminders() {
  console.log("Reloading active reminders from database...");
  const reminders = await db.getAllActiveReminders();
  reminders.forEach(scheduleReminder);
  console.log(`Loaded ${reminders.length} active reminders`);
}

module.exports = { scheduleReminder, reloadReminders };
