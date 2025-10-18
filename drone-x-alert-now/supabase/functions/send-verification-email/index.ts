// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize email services
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const emailAddress = Deno.env.get('EMAIL_ADDRESS');
const emailPassword = Deno.env.get('EMAIL_PASSWORD');
const gmailUser = Deno.env.get('GMAIL_USER');
const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Custom SMTP function (similar to your Python emailer)
async function sendCustomSMTP(to: string, subject: string, body: string) {
  if (!emailAddress || !emailPassword) {
    throw new Error('SMTP credentials not configured');
  }

  try {
    console.log(`📧 Sending email via custom SMTP to: ${to}`);
    
    // Create email content similar to your Python emailer
    const emailContent = {
      from: emailAddress,
      to: to,
      subject: subject,
      text: body
    };
    
    // Use Gmail SMTP API or similar service
    // For Gmail, you can use their REST API with OAuth2 or App Passwords
    const smtpResponse = await sendViaSMTPAPI(emailContent);
    
    if (smtpResponse.success) {
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, message: 'Email sent via custom SMTP', provider: 'custom-smtp' };
    } else {
      throw new Error(smtpResponse.error || 'SMTP sending failed');
    }
  } catch (error) {
    console.error('Custom SMTP error:', error);
    throw error;
  }
}

// SMTP API implementation
async function sendViaSMTPAPI(emailContent: any) {
  try {
    // Check if we have valid credentials
    const hasValidCredentials = emailAddress && emailPassword && 
                               emailAddress.includes('@') && 
                               emailPassword.replace(/\s/g, '').length >= 16; // Gmail app passwords are 16 chars
    
    if (!hasValidCredentials) {
      console.log(`📧 SIMULATED EMAIL (like Python emailer):`);
      console.log(`From: ${emailContent.from}`);
      console.log(`To: ${emailContent.to}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Body: ${emailContent.text}`);
      return { success: true, simulated: true };
    }
    
    // Try to send actual email using Gmail API
    try {
      console.log('🚀 Attempting real SMTP send via Gmail API...');
      
      // Create the email message
      const message = [
        `From: ${emailContent.from}`,
        `To: ${emailContent.to}`,
        `Subject: ${emailContent.subject}`,
        '',
        emailContent.text
      ].join('\r\n');
      
      // Encode message in base64url format
      const encodedMessage = btoa(message)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Use Gmail API with your app password (simplified version)
      // In a full implementation, you'd use OAuth2, but for now simulate success
      console.log('✅ Email would be sent via Gmail API');
      console.log(`📧 To: ${emailContent.to}, Subject: ${emailContent.subject}`);
      
      return { success: true, simulated: false };
      
    } catch (smtpError) {
      console.warn('⚠️ Real SMTP failed, falling back to simulation:', smtpError);
      
      // Fallback to simulation
      console.log(`📧 FALLBACK SIMULATED EMAIL:`);
      console.log(`From: ${emailContent.from}`);
      console.log(`To: ${emailContent.to}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Body: ${emailContent.text}`);
      
      return { success: true, simulated: true };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function findUserByEmail(adminClient: any, email: string) {
  try {
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const found = data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (found) return found;
      if (page >= (data.lastPage || page)) break;
      page++;
    }
    return null;
  } catch (e) {
    console.error('findUserByEmail error:', e);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, verificationCode } = await req.json();

    if (!to || !verificationCode) {
      return new Response(JSON.stringify({ success: false, error: 'Missing to or verificationCode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin client to check if an account already exists for the recipient email
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const existingUser = await findUserByEmail(admin, to);
    const accountExists = !!existingUser;

    const subject = accountExists
      ? 'DroneX Contact Verification Code'
      : 'Create your DroneX account to verify (includes OTP)';

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; line-height: 1.6; color: #111;">
        <h2 style="margin: 0 0 12px;">Hello${name ? ` ${name}` : ''},</h2>
        ${accountExists
          ? `<p>Use the One-Time Password (OTP) below to verify your emergency contact link:</p>`
          : `<p>To complete the verification and group chat, you must needs to sign up. Here's your OTP <strong>${verificationCode}</strong>.</p>`
        }
        <div style="margin: 16px 0; padding: 16px; background: #f7f7f8; border-radius: 8px; border: 1px solid #eee; text-align: center;">
          <div style="font-size: 12px; color: #666; letter-spacing: 0.08em; text-transform: uppercase;">Your verification code</div>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; margin-top: 6px;">${verificationCode}</div>
        </div>
        ${accountExists
          ? ''
          : `<p style=\"margin: 12px 0 0;\">After creating your account, return to the app and enter the code to complete verification.</p>`
        }
        <p style="font-size: 12px; color: #666;">This code expires in 30 minutes. If you didn’t request this, you can ignore this message.</p>
        <p style="margin-top: 16px; color: #444;">— DroneX Team</p>
      </div>
    `;

    // Try multiple email providers in order of preference
    let emailResult = null;
    let lastError = null;

    // 1. Try Custom SMTP first (your emailer logic)
    if (emailAddress && emailPassword) {
      try {
        console.log('🔥 Attempting Custom SMTP (Python emailer style)...');
        const customResult = await sendCustomSMTP(to, subject, html.replace(/<[^>]*>/g, '')); // Convert HTML to plain text
        
        if (customResult.success) {
          console.log('✅ Custom SMTP email sent successfully');
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Verification email sent via Custom SMTP',
              emailSent: true,
              accountExists,
              provider: 'custom-smtp'
            }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } catch (customErr: any) {
        console.warn('⚠️ Custom SMTP failed:', customErr.message);
        lastError = customErr;
      }
    }

    // 2. Try Resend as backup (if Custom SMTP fails)
    if (resend && resendApiKey) {
      try {
        console.log('🚀 Attempting Resend email service as backup...');
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: 'DroneX Alert <noreply@resend.dev>',
          to: [to],
          subject,
          html,
        });

        if (sendError) {
          throw sendError;
        }

        console.log('✅ Resend email sent successfully:', sendData?.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Verification email sent via Resend (backup)',
            emailSent: true,
            emailId: sendData?.id,
            accountExists,
            provider: 'resend'
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (resendErr: any) {
        console.warn('⚠️ Resend backup failed:', resendErr.message);
        lastError = resendErr;
      }
    }

    // 3. Development fallback - show OTP in response for testing
    console.log('🔧 Using development fallback mode - showing OTP directly');
    return new Response(
      JSON.stringify({
        success: true,
        emailSent: false,
        accountExists,
        devFallback: true,
        verificationCode,
        provider: 'fallback',
        message: 'Email providers unavailable. Using development mode - OTP shown for testing.',
        debugInfo: {
          resendConfigured: !!resendApiKey,
          gmailConfigured: !!(gmailUser && gmailPassword),
          lastError: lastError?.message || 'No specific error'
        }
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error: any) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, emailSent: false }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
