// netlify/functions/send-login-alert.js

/**
 * This Netlify Function receives a POST from the client whenever
 * a user logs in on a different device. It then calls Brevo's
 * transactional API (templateId: 3) to notify the user.
 *
 * Required environment variables in Netlify (Site settings → Build & deploy → Environment):
 *   SUPABASE_URL       → https://dapwpgvnfjcfqqhrpxla.supabase.co   (not strictly needed here)
 *   SUPABASE_ANON_KEY  → your Supabase anon key                     (not used below)
 *   BREVO_API_KEY      → your Brevo transactional API key (xkeysib-…)
 */

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Allow": "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // Parse JSON body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const { email, name, device, time } = body;
  if (!email || !name || !device || !time) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // Read Brevo API key from env
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error("Missing BREVO_API_KEY environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Brevo not configured." }),
    };
  }

  // Build the Brevo payload (templateId: 3)
  const BREVO_SENDER_NAME  = "Chukwuemeka Bullion Exchange";
  const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
  const BREVO_TEMPLATE_ID  = 3;

  // If your template expects {{ params.FIRSTNAME }} or other keys, include them here.
  const brevoPayload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: email,
        name: name,
      },
    ],
    templateId: BREVO_TEMPLATE_ID,
    params: {
      FIRSTNAME: name,
      EMAIL: email,
      DEVICE: device,
      TIME: time,
    }
  };

  // Send to Brevo
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(brevoPayload)
    });

    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      // no JSON
    }

    if (!res.ok) {
      console.error("Brevo responded with error:", res.status, json);
      const msg = json?.message || json?.error || "Unknown Brevo error";
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Brevo error: " + msg }),
      };
    }

    // Success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Login alert email queued." }),
    };
  } catch (err) {
    console.error("Error calling Brevo:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
