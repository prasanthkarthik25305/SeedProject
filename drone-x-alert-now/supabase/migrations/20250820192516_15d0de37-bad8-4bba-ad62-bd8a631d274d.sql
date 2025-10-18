-- Assign rescue_team role to users who registered through rescue team signup
-- Based on the pattern, these users likely tried to register as rescue team members

INSERT INTO public.user_roles (user_id, role) 
VALUES 
  ('c5c5aabf-6f57-4b1b-9873-4680baa40f5a', 'rescue_team'),
  ('66e349fc-df56-479f-933d-5de96bbef434', 'rescue_team'),
  ('e532286c-e27f-409c-843b-28a5a001ebfe', 'rescue_team')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also create basic rescue team profiles for these users
INSERT INTO public.rescue_teams (user_id, team_name, contact_email, status) 
VALUES 
  ('c5c5aabf-6f57-4b1b-9873-4680baa40f5a', 'Alpha Rescue Team', 'gsrinivasarao8960@gmail.com', 'available'),
  ('66e349fc-df56-479f-933d-5de96bbef434', 'Beta Rescue Team', 'vybusiness78@gmail.com', 'available'),
  ('e532286c-e27f-409c-843b-28a5a001ebfe', 'Gamma Rescue Team', 'venkatpersonal73@gmail.com', 'available')
ON CONFLICT (user_id) DO NOTHING;