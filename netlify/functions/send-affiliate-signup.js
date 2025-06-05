// File: netlify/functions/send-affiliate-signup.js

/**
 * This Netlify Function:
 * 1) Inserts a new row into public.affiliate_signups
 * 2) Sends a Brevo email with templateId = 10
 * 3) Returns JSON { message: "..." } on success, or { error: "..." } on failure
 */

exports.handler = async (event, context) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON payload." }),
    };
  }

  const { name, email, phone, password } = payload;

  // Basic validation
  if (!name || !email || !phone || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Please provide name, email, phone, and password." }),
    };
  }
  if (password.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Password must be at least 8 characters." }),
    };
  }

  // 1) Initialize Supabase client (service role)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error." }),
    };
  }
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 2) Insert into affiliate_signups table
    const { data: inserted, error: insertErr } = await supabase
      .from("affiliate_signups")
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password, // (store plaintext per your existing pattern; ideally you'd hash)
        },
      ])
      .select("id")
      .single();

    if (insertErr) {
      console.error("❌ Supabase insert error:", insertErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: insertErr.message }),
      };
    }

    console.log("✅ New affiliate signup ID:", inserted.id);

    // 3) Send Brevo welcome email (templateId = 10)
    const BREVO_API = (process.env.BREVO_API || "").trim();
    if (!BREVO_API) {
      console.warn("⚠️ BREVO_API not set; skipping email send.");
    } else {
      const brevoPayload = {
        templateId: 10,
        sender: {
          // Must match a verified sender in Brevo
          name: "CBE Global",
          email: "no-reply@apexincomeoptions.com.ng",
        },
        to: [
          {
            email: email.trim().toLowerCase(),
            name: name.trim(),
          },
        ],
        params: {
          FIRSTNAME: name.trim().split(" ")[0] || name.trim(),
        },
      };

      console.log("📤 Sending Brevo email to:", email.trim().toLowerCase());
      try {
        const resp = await fetch("https://api.sendinblue.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API,
          },
          body: JSON.stringify(brevoPayload),
        });
        const json = await resp.json();
        if (!resp.ok) {
          console.error("❌ Brevo error response:", json);
        } else {
          console.log("✅ Brevo response success:", json);
        }
      } catch (err) {
        console.error("❌ Error calling Brevo API:", err);
      }
    }

    // 4) Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Signup successful! Please check your email." }),
    };
  } catch (err) {
    console.error("🔥 Unexpected function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected server error." }),
    };
  }
};
