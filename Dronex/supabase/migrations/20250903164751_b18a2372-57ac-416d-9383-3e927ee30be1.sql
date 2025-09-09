-- Add missing RLS policies for admin_settings and system_alerts only
CREATE POLICY "Admins can manage settings"
ON public.admin_settings
FOR ALL
USING (is_admin());

CREATE POLICY "Admins can manage alerts" 
ON public.system_alerts
FOR ALL
USING (is_admin());