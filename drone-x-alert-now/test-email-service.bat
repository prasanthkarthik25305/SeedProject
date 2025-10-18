@echo off
echo Testing DroneX Email Service...

echo.
echo 1. Checking if Supabase CLI is logged in...
supabase status

echo.
echo 2. Testing the send-verification-email function...
echo This will send a test email to check if the service works.

echo.
echo 3. Deploy and test the function:
supabase functions deploy send-verification-email

echo.
echo 4. You can test the function manually with:
echo curl -X POST https://your-project.supabase.co/functions/v1/send-verification-email ^
echo   -H "Content-Type: application/json" ^
echo   -H "Authorization: Bearer YOUR_ANON_KEY" ^
echo   -d "{\"to\": \"test@example.com\", \"name\": \"Test User\", \"verificationCode\": \"123456\"}"

echo.
echo 5. Check logs with:
echo supabase functions logs send-verification-email

pause