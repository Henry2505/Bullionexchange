// netlify/functions/send-signal-alert.js

/**
 * Netlify Function: send-signal-alert
 *
 * Called whenever a new signal is inserted. Instead of sending signal details,
 * it simply emails the user (using Brevo template ID 2) telling them to log in
 * to view the latest VIP signal.
 *
 * Environment variable (in Netlify):
 *   BREVO_API_KEY = xkeysib-<your-actual-brevo-key>
 */

exports.handler = async (event) => {
  // 1) Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // 2) Parse JSON body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const { email, name } = body;
  if (!email || !name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // 3) Read Brevo API key from environment
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error("Missing BREVO_API_KEY environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Brevo not configured." }),
    };
  }

  // 4) Build the Brevo payload using templateId 2
  //    (Your “New Signal Arrived – please log in to view” template)
  const BREVO_SENDER_NAME  = "CBE VIP Dashboard";
  const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
  const BREVO_TEMPLATE_ID  = 2;

  const brevoPayload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: email,
        name: name,
      }
    ],
    templateId: BREVO_TEMPLATE_ID,
    // If your template references {{ params.FIRSTNAME }} or similar, include:
    params: {
      FIRSTNAME: name
      // You can add a login link param if your template uses it, e.g.
      // LOGIN_LINK: "https://apexincomeoptions.com.ng/login.html"
    }
  };

  // 5) Send via Brevo
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
      // ignore parse errors
    }

    if (!res.ok) {
      console.error("Brevo error:", res.status, json);
      const msg = json?.message || json?.error || "Unknown Brevo error";
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Brevo error: " + msg }),
      };
    }

    // 6) Success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User notified of new signal." }),
    };
  } catch (err) {
    console.error("Error calling Brevo:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
