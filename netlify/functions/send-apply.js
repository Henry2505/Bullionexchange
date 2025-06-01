// netlify/functions/send-apply.js

/**
 * Netlify Function: send-apply
 *
 * Expects (in Netlify Dashboard → Environment Variables):
 *   SUPABASE_URL       (e.g. "https://your-project.supabase.co")
 *   SUPABASE_ANON_KEY  (your Supabase anon/public API key)
 *   BREVO_API_KEY      (xkeysib-... your Brevo transactional API key)
 */

const { createClient } = require("@supabase/supabase-js");

// Netlify Functions run on Node 18+, so "fetch" is available globally.

exports.handler = async (event) => {
  // Only accept POST:
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Allow": "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // 1) Parse the JSON body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const { name, email, password, phone, experience } = data;

  // 2) Basic validation
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // 3) Initialize Supabase client
  const SUPABASE_URL       = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase not configured." }),
    };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 4) Check if user email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("Supabase check error:", checkError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to verify email availability." }),
      };
    }
    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "This email is already registered." }),
      };
    }

    // 5) Insert new user row
    const { error: insertError } = await supabase
      .from("users")
      .insert([
        { name, email, password, phone, experience, status: "pending" },
      ]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to submit application." }),
      };
    }

    // 6) Build Brevo email payload
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Brevo not configured." }),
      };
    }

    const BREVO_SENDER_NAME  = "Chukwuemeka Bullion Exchange";
    const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
    const BREVO_TEMPLATE_ID  = 4; // Confirm this matches your Brevo template ID

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
        NAME: name,
        EMAIL: email,
      },
    };

    // 7) Call Brevo’s REST API to send the email
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    // Attempt to parse any JSON Brevo returns
    let brevoResult = null;
    try {
      brevoResult = await brevoResponse.json();
    } catch (jsonErr) {
      console.warn("Could not parse Brevo response JSON:", jsonErr);
    }

    if (!brevoResponse.ok) {
      console.error("Brevo responded with error:", brevoResponse.status, brevoResult);
      const brevoMsg = brevoResult?.message || brevoResult?.error || "Unknown Brevo error";
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Brevo error: " + brevoMsg }),
      };
    }

    // 8) Everything succeeded
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Application submitted successfully. Email queued.",
      }),
    };
  } catch (err) {
    console.error("Unexpected error in send-apply function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
