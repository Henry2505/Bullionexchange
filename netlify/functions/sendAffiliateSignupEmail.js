// netlify/functions/sendAffiliateSignupEmail.js

import fetch from "node-fetch"; // If your Netlify Node runtime already has global `fetch`, you can remove this import.

exports.handler = async function(event, context) {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  // 1) Parse incoming JSON
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: "Invalid JSON",
    };
  }

  const { email, firstName, token, referralCode } = body;
  if (!email || !firstName || !token || !referralCode) {
    return {
      statusCode: 400,
      body: "Missing one of: email, firstName, token, referralCode",
    };
  }

  // 2) Build Supabase confirmation URL from the token
  const confirmationUrl = `https://dapwpgvnfjcfqqhrpxla.supabase.co/auth/v1/verify?token=${token}`;

  // 3) Read Brevo credentials from Netlify environment
  const BREVO_API    = process.env.BREVO_API;            // must match exactly what you set in Netlify
  const TEMPLATE_ID  = process.env.BREVO_TEMPLATE_ID;    // should be "10"

  if (!BREVO_API || typeof BREVO_API !== "string" || BREVO_API.trim() === "") {
    console.error("❌ Missing or empty BREVO_API environment variable");
    return {
      statusCode: 500,
      body: "Server configuration error: missing BREVO_API",
    };
  }
  if (!TEMPLATE_ID || isNaN(Number(TEMPLATE_ID))) {
    console.error("❌ Missing or invalid BREVO_TEMPLATE_ID environment variable");
    return {
      statusCode: 500,
      body: "Server configuration error: missing BREVO_TEMPLATE_ID",
    };
  }

  // (Optional) Log a truncated version so you can confirm in Netlify logs
  console.log("✅ BREVO_API (first 8 chars):", BREVO_API.slice(0, 8) + "…");

  // 4) Prepare payload for Brevo SMTP API
  const payload = {
    sender: {
      name: "CBE Support",
      email: "noreply@apexincomeoptions.com.ng",
    },
    to: [
      {
        email: email,
        name: firstName,
      },
    ],
    templateId: Number(TEMPLATE_ID),
    params: {
      firstName: firstName,
      confirmationUrl: confirmationUrl,
      referralCode: referralCode,
    },
  };

  // 5) Call Brevo’s /smtp/email endpoint
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API.trim(),
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("❌ Brevo API returned error:", resp.status, data);
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: "Brevo send failed", details: data }),
      };
    }

    console.log("✅ Brevo email queued:", data);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent", brevo: data }),
    };
  } catch (err) {
    console.error("❌ Netlify Function error:", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
