-- Manually assign admin role to the user who just registered
INSERT INTO public.user_roles (user_id, role) 
VALUES ('c5c5aabf-6f57-4b1b-9873-4680baa40f5a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also assign to the other user if needed
INSERT INTO public.user_roles (user_id, role) 
VALUES ('66e349fc-df56-479f-933d-5de96bbef434', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;