-- Add missing UPDATE policy for emergency_alerts (admins can resolve alerts)
-- Run this in your Supabase SQL Editor

-- Emergency Alerts UPDATE policy (allows admins to resolve alerts)
CREATE POLICY "Admins can update all emergency alerts" ON emergency_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Also add UPDATE policy for rescue_missions (admins can complete missions)
CREATE POLICY "Admins can update all rescue missions" ON rescue_missions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
