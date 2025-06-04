/**
 * netlify/functions/sendAffiliateSignupEmail.js
 *
 * A Netlify Function that sends the “Affiliate Signup Confirmation” email
 * via Brevo’s SMTP API—using template ID 10 and your BREVO_API_KEY (set as an env var).
 *
 * Expects a POST request with JSON body containing:
 *   { email, firstName, token, referralCode }
 *
 * This should be called immediately after Supabase signUp() succeeds.
 */

import fetch from "node-fetch"; // If using Node 18+ with built‑in fetch, you can remove this import.

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse incoming JSON
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { email, firstName, token, referralCode } = payload;
  if (!email || !firstName || !token || !referralCode) {
    return { statusCode: 400, body: "Missing required fields" };
  }

  // Build the confirmation URL from the token
  const confirmationUrl = `https://dapwpgvnfjcfqqhrpxla.supabase.co/auth/v1/verify?token=${token}`;

  // Read Brevo credentials from environment
  const BREVO_API_KEY   = process.env.BREVO_API_KEY;
  const TEMPLATE_ID     = process.env.BREVO_TEMPLATE_ID; // should be "10"
  if (!BREVO_API_KEY || !TEMPLATE_ID) {
    console.error("Missing BREVO_API_KEY or BREVO_TEMPLATE_ID in environment");
    return { statusCode: 500, body: "Server configuration error" };
  }

  // Build the Brevo SMTP payload
  const brevoPayload = {
    sender: {
      name: "CBE Support",
      email: "noreply@apexincomeoptions.com.ng"
    },
    to: [
      {
        email: email,
        name: firstName
      }
    ],
    templateId: Number(TEMPLATE_ID),
    params: {
      firstName: firstName,
      confirmationUrl: confirmationUrl,
      referralCode: referralCode
    }
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Brevo API error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Brevo send failed", details: data })
      };
    }

    // Email sent successfully
    return { statusCode: 200, body: JSON.stringify({ message: "Email sent", brevo: data }) };

  } catch (err) {
    console.error("Netlify Function error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
