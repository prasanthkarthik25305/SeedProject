// @deno-types="https://deno.land/std@0.168.0/http/server.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Import Deno namespace for TypeScript type checking
/// <reference lib="deno.ns" />

serve(async (req) => {
  try {
    const { to, name, verificationCode } = await req.json()

    // Log for debugging
    console.log(`Sending verification code ${verificationCode} to ${to}`)

    const emailData = {
      service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
      template_id: Deno.env.get('EMAILJS_TEMPLATE_ID'),
      user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
      template_params: {
        to_email: to,
        to_name: name,
        verification_code: verificationCode,
        subject: '🚁 DroneX Emergency Contact Verification'
      }
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    if (response.ok) {
      const result = await response.text()
      console.log('Email sent successfully:', result)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification email sent successfully',
          emailSent: true
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    } else {
      const errorText = await response.text()
      console.error('EmailJS error:', errorText)
      throw new Error(`EmailJS API error: ${response.status} - ${errorText}`)
    }

  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        emailSent: false
      }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    )
  }
})
