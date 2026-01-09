-- Time Stamp Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  project_type text not null check (project_type in ('client', 'internal', 'break')),
  color text default '#8b5cf6',
  archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Future team features
  team_id uuid default null,
  is_shared boolean default false
);

-- Time entries table
create table public.time_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  date date not null,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_seconds integer not null default 0,
  is_manual boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Active timer table (only one per user)
create table public.active_timers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  project_id uuid references public.projects(id) on delete cascade not null,
  start_time timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User preferences
create table public.user_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  slack_webhook_url text,
  notion_api_key text,
  notion_database_id text,
  notifications_enabled boolean default true,
  notification_milestones integer[] default array[30, 60, 120, 240],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_projects_user_id on public.projects(user_id);
create index idx_time_entries_user_id on public.time_entries(user_id);
create index idx_time_entries_date on public.time_entries(date);
create index idx_time_entries_project_id on public.time_entries(project_id);
create index idx_time_entries_user_date on public.time_entries(user_id, date);

-- Row Level Security
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.active_timers enable row level security;
alter table public.user_preferences enable row level security;

-- Policies for projects
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Policies for time_entries
create policy "Users can view their own time entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "Users can create their own time entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own time entries"
  on public.time_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own time entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- Policies for active_timers
create policy "Users can view their own active timer"
  on public.active_timers for select
  using (auth.uid() = user_id);

create policy "Users can create their own active timer"
  on public.active_timers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own active timer"
  on public.active_timers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own active timer"
  on public.active_timers for delete
  using (auth.uid() = user_id);

-- Policies for user_preferences
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can create their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at_column();

create trigger update_time_entries_updated_at
  before update on public.time_entries
  for each row execute function update_updated_at_column();

create trigger update_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function update_updated_at_column();
