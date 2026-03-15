require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
const webhookRoutes = require("./routes/webhook");
app.use("/webhook", webhookRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "RemindMe bot is running 🤖", timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`RemindMe bot running on port ${PORT}`);

  // Reload all reminders from DB on startup
  const { reloadReminders } = require("./scheduler");
  await reloadReminders();
});
