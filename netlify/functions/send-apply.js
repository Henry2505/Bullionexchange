// netlify/functions/send-apply.js

/**
 * Netlify Function: send-apply
 *
 * Inserts a new user into Supabase “users” table and then sends a Brevo email
 * using template ID 1 (with any required template parameters).
 *
 * Environment Variables (set these in Netlify site settings → Build & deploy → Environment variables):
 *   SUPABASE_URL       → e.g. "https://dapwpgvnfjcfqqhrpxla.supabase.co"
 *   SUPABASE_ANON_KEY  → your Supabase anon key
 *   BREVO_API_KEY      → your Brevo transactional API key (xkeysib-...)
 */

const { createClient } = require("@supabase/supabase-js");

// Node 18+ on Netlify includes global fetch(), so no extra import is needed.

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Allow": "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // 1) Parse the incoming JSON body
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
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables missing");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase not configured." }),
    };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 4) Check if this email already exists in "users"
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

    // 5) Insert the new user row
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

    // 6) Build the Brevo email payload using templateId: 1
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Brevo not configured." }),
      };
    }

    // Make sure this sender is verified in your Brevo dashboard
    const BREVO_SENDER_NAME  = "Chukwuemeka Bullion Exchange";
    const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
    const BREVO_TEMPLATE_ID  = 1; // ← changed to template ID 1

    // If your Brevo template uses variables like {{ params.NAME }} or {{ params.EMAIL }},
    // supply them here in the params object exactly as your template expects.
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
      // No "subject" or "htmlContent" here—letting Brevo use your template’s subject/body
      params: {
        NAME: name,
        EMAIL: email,
        PHONE: phone,
        EXPERIENCE: experience
        // Add any additional params your template references, e.g. LINK, etc.
      },
    };

    // 7) Call Brevo’s SMTP endpoint to send the templated email
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    // 8) Attempt to parse the JSON response (in case of error details)
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

    // 9) Return success to the client
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Application submitted successfully. Email queued using template ID ${BREVO_TEMPLATE_ID}.`
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
