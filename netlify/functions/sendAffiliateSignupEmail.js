// netlify/functions/sendAffiliateSignupEmail.js

/**
 * A Netlify Function to send the “Affiliate Signup Confirmation” email
 * via Brevo (Sendinblue) SMTP, using template ID 10.
 *
 * Expects a POST body: { email, firstName, token, referralCode }
 * Reads BREVO_API_KEY and BREVO_TEMPLATE_ID from environment variables.
 */

import fetch from "node-fetch"; // Only needed if your environment doesn’t support global fetch.

exports.handler = async function(event, context) {
  // 1) Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  // 2) Parse JSON payload
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseErr) {
    return {
      statusCode: 400,
      body: "Invalid JSON"
    };
  }

  const { email, firstName, token, referralCode } = body;
  if (!email || !firstName || !token || !referralCode) {
    return {
      statusCode: 400,
      body: "Missing one of: email, firstName, token, referralCode"
    };
  }

  // 3) Build confirmation URL (Supabase verifies token)
  const confirmationUrl = `https://dapwpgvnfjcfqqhrpxla.supabase.co/auth/v1/verify?token=${token}`;

  // 4) Read Brevo credentials from environment
  const BREVO_API_KEY   = process.env.BREVO_API_KEY;
  const TEMPLATE_ID     = process.env.BREVO_TEMPLATE_ID; // "10"
  if (!BREVO_API_KEY || !TEMPLATE_ID) {
    console.error("Missing BREVO_API_KEY or BREVO_TEMPLATE_ID in environment");
    return {
      statusCode: 500,
      body: "Server is not configured properly"
    };
  }

  // 5) Prepare payload for Brevo SMTP API
  const payload = {
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

  // 6) Call Brevo’s /smtp/email endpoint
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Brevo API responded with error:", resp.status, data);
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: "Brevo send failed", details: data })
      };
    }

    // Success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent", brevo: data })
    };

  } catch (err) {
    console.error("Netlify Function error:", err);
    return {
      statusCode: 500,
      body: "Internal Server Error"
    };
  }
};
