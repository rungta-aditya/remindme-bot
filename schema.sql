-- Users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  plan text default 'free',
  reminders_this_month integer default 0,
  month_reset_at timestamp default now(),
  razorpay_subscription_id text,
  created_at timestamp default now()
);

-- Reminders table
create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  user_phone text references users(phone),
  message text not null,
  frequency text not null,
  cron_expression text not null,
  next_run_at timestamp,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Payments table
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  user_phone text references users(phone),
  razorpay_payment_id text,
  razorpay_order_id text,
  amount integer,
  status text default 'pending',
  created_at timestamp default now()
);
