-- Veritas Enclave - Supabase Database Schema
-- Run this in your Supabase SQL Editor to create the necessary tables.

-- 1. Create wallet_sessions table
CREATE TABLE IF NOT EXISTS wallet_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  features_accessed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create scan_history table
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_address TEXT NOT NULL,
  target_protocol TEXT,
  tx_amount NUMERIC NOT NULL,
  verdict TEXT NOT NULL, -- 'APPROVED', 'BLOCKED', 'REVIEW'
  fast_path BOOLEAN DEFAULT false,
  xgboost_score NUMERIC NOT NULL,
  total_latency_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create agent_reports table
CREATE TABLE IF NOT EXISTS agent_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID REFERENCES scan_history(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'Forensics Agent', 'Protocol Agent', 'Execution Sim Agent'
  status TEXT NOT NULL, -- 'safe', 'warning', 'critical'
  summary TEXT,
  latency_ms INTEGER NOT NULL,
  findings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Enable row level security (RLS) policies if you want public inserts from the frontend
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (since users aren't authenticated via email, just wallet)
CREATE POLICY "Allow anon insert to wallet_sessions" ON wallet_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert to scan_history" ON scan_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert to agent_reports" ON agent_reports FOR INSERT TO anon WITH CHECK (true);

-- Allow reading own records (simplified, assuming we query by wallet_address)
CREATE POLICY "Allow read based on wallet" ON scan_history FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read based on wallet" ON agent_reports FOR SELECT TO anon USING (true);
