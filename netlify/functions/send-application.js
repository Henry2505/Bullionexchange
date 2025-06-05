// File: netlify/functions/send-application.js

// If you installed no extra packages, Node 18 on Netlify already has fetch built in.
// We only need the supabase-js client here.

exports.handler = async function (event, context) {
  // 1) Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // 2) Parse incoming JSON
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON payload." }),
    };
  }

  const {
    name,
    email,
    password,
    phone,
    experience,
    referral_code = null,
    referred_by = null,
  } = payload;

  // 3) Validate required fields
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // 4) Initialize Supabase client (SERVICE key)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error." }),
    };
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 5) Insert into public.users
    const { data: insertedUser, error: insertErr } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password,
          phone,
          experience,
          referral_code,
          referred_by,
          status: "active",
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

    const newUserId = insertedUser.id;
    console.log("✅ Created user ID:", newUserId);

    // 6) Send Welcome email via Brevo
    const BREVO_API = process.env.BREVO_API?.trim();
    if (!BREVO_API) {
      console.warn("⚠️ BREVO_API not configured; skipping email send.");
    } else {
      // Build the Brevo payload. Adjust 'sender' to match your verified sender identity in Brevo.
      const brevoPayload = {
        templateId: 10,
        sender: {
          name: "CBE Global",
          email: "no-reply@apexincomeoptions.com.ng",
        },
        to: [
          {
            email: email,
            name: name,
          },
        ],
        params: {
          FIRSTNAME: name.split(" ")[0] || name,
          /* Add any other template parameters here if your Brevo template uses them. */
        },
      };

      console.log("📤 Sending Brevo email to:", email);

      try {
        const brevoRes = await fetch("https://api.sendinblue.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API,
          },
          body: JSON.stringify(brevoPayload),
        });

        const brevoJson = await brevoRes.json();
        if (!brevoRes.ok) {
          console.error("❌ Brevo responded with error:", brevoJson);
        } else {
          console.log("✅ Brevo response success:", brevoJson);
        }
      } catch (brevoErr) {
        console.error("❌ Error while sending Brevo email:", brevoErr);
      }
    }

    // 7) Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Application submitted successfully!" }),
    };
  } catch (err) {
    console.error("🔥 Unexpected function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected server error." }),
    };
  }
};
