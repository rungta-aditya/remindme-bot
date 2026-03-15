const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FREE_LIMIT = 5;

async function getOrCreateUser(phone) {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (existing) {
    // Reset monthly count if new month
    const resetAt = new Date(existing.month_reset_at);
    const now = new Date();
    if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      await supabase
        .from("users")
        .update({ reminders_this_month: 0, month_reset_at: now.toISOString() })
        .eq("phone", phone);
      existing.reminders_this_month = 0;
    }
    return existing;
  }

  const { data: newUser } = await supabase
    .from("users")
    .insert({ phone })
    .select()
    .single();

  return newUser;
}

async function canCreateReminder(phone) {
  const user = await getOrCreateUser(phone);
  if (user.plan === "pro") return { allowed: true, user };
  if (user.reminders_this_month < FREE_LIMIT) return { allowed: true, user };
  return { allowed: false, user };
}

async function createReminder(phone, message, frequency, cronExpression) {
  const { data } = await supabase
    .from("reminders")
    .insert({ user_phone: phone, message, frequency, cron_expression: cronExpression, is_active: true })
    .select()
    .single();

  await supabase
    .from("users")
    .update({ reminders_this_month: supabase.rpc("increment", { x: 1 }) })
    .eq("phone", phone);

  return data;
}

async function getUserReminders(phone) {
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_phone", phone)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data || [];
}

async function deleteAllReminders(phone) {
  await supabase
    .from("reminders")
    .update({ is_active: false })
    .eq("user_phone", phone);
}

async function deleteReminderByDescription(phone, target) {
  const reminders = await getUserReminders(phone);
  if (!reminders.length) return false;

  // Find best match by message content
  const match = reminders.find(r =>
    r.message.toLowerCase().includes(target.toLowerCase())
  ) || reminders[0];

  await supabase
    .from("reminders")
    .update({ is_active: false })
    .eq("id", match.id);

  return match;
}

async function pauseAllReminders(phone) {
  await supabase
    .from("reminders")
    .update({ is_active: false })
    .eq("user_phone", phone);
}

async function resumeAllReminders(phone) {
  await supabase
    .from("reminders")
    .update({ is_active: true })
    .eq("user_phone", phone);
}

async function upgradeUser(phone) {
  await supabase
    .from("users")
    .update({ plan: "pro" })
    .eq("phone", phone);
}

async function getAllActiveReminders() {
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .eq("is_active", true);

  return data || [];
}

module.exports = {
  getOrCreateUser,
  canCreateReminder,
  createReminder,
  getUserReminders,
  deleteAllReminders,
  deleteReminderByDescription,
  pauseAllReminders,
  resumeAllReminders,
  upgradeUser,
  getAllActiveReminders
};
