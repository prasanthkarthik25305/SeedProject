-- Create shared_locations table for real-time location sharing
CREATE TABLE public.shared_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shared_with UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for shared locations
CREATE POLICY "Users can manage own shared locations" 
ON public.shared_locations 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view locations shared with them" 
ON public.shared_locations 
FOR SELECT 
USING (auth.uid() = shared_with AND is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Add location sharing preferences to emergency_contacts
ALTER TABLE public.emergency_contacts 
ADD COLUMN location_sharing_enabled BOOLEAN DEFAULT false,
ADD COLUMN location_sharing_duration INTEGER DEFAULT 60; -- minutes

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_shared_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_locations_updated_at
BEFORE UPDATE ON public.shared_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_shared_locations_updated_at();

-- Enable realtime for shared_locations
ALTER TABLE public.shared_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_locations;