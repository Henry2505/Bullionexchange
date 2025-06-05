// netlify/functions/send-application.js

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Parse the incoming JSON payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload." }) };
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

  // Basic server‑side validation
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // Initialize Supabase client using Service Role Key (has full insert/delete rights)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase credentials not configured." }),
    };
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1) Insert into public.users
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
          status: "active", // default, but we explicitly set it
        },
      ])
      .select("id") // return only the new id
      .single();

    if (insertErr) {
      console.error("Insert user error:", insertErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: insertErr.message }),
      };
    }

    const newUserId = insertedUser.id;

    // 2) Optionally: If this new user should also become an affiliate themselves
    //    (uncomment below if you want every new user to also get an entry in public.affiliates)
    // const { error: affErr } = await supabase
    //   .from("affiliates")
    //   .insert([{ user_id: newUserId, referral_code: generateRandomCode() }]);
    // if (affErr) console.error("Failed to auto‑create affiliate row:", affErr);

    // 3) Send a welcome / confirmation email via Brevo
    const BREVO_API = process.env.BREVO_API;
    if (!BREVO_API) {
      console.warn("BREVO_API not configured; skipping email send.");
    } else {
      // Build the Brevo “send‐template” request
      const brevoPayload = {
        templateId: 10,
        to: [{ email: email, name: name }],
        params: {
          FIRSTNAME: name.split(" ")[0] || name,
          /* you can add more template parameters here if needed */
        },
      };

      const brevoRes = await fetch("https://api.sendinblue.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API.trim(),
        },
        body: JSON.stringify(brevoPayload),
      });
      if (!brevoRes.ok) {
        const brevoBody = await brevoRes.text();
        console.error("Brevo send error:", brevoBody);
        // We will not block the main flow if email fails; just log and continue.
      }
    }

    // 4) Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Application submitted successfully!" }),
    };
  } catch (err) {
    console.error("Unexpected error in send-application:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected server error." }),
    };
  }
};

// (Optional) Helper to generate a referral code for new affiliates
// function generateRandomCode() {
//   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let code = "";
//   for (let i = 0; i < 8; i++) {
//     code += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return code;
// }
