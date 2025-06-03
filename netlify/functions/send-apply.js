// netlify/functions/send-apply.js

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Allow": "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const { name, email, password, phone, experience, referral_code } = data;
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

  // ─── Supabase credentials (hard-coded per your request) ─────────────────────────
  const SUPABASE_URL      = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables missing");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase not configured." }),
    };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let referredById = null;
  if (referral_code) {
    // Validate referral code against the "affiliates" table
    const { data: affiliateRow, error: checkReferralErr } = await supabase
      .from("affiliates")
      .select("user_id")
      .eq("referral_code", referral_code)
      .single();

    if (checkReferralErr) {
      console.error("Error checking referral code:", checkReferralErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to verify referral code." }),
      };
    }
    if (!affiliateRow) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid referral code." }),
      };
    }
    referredById = affiliateRow.user_id;
  }

  try {
    // Check if email already exists in "users"
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

    // Insert new user into "users" table, including referred_by if applicable
    const insertPayload = {
      name,
      email,
      password,
      phone,
      experience,
      status: "pending",
    };
    if (referredById) {
      insertPayload.referred_by = referredById;
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert([insertPayload]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to submit application." }),
      };
    }

    // ─── Brevo email notification ────────────────────────────────────────────────
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Brevo not configured." }),
      };
    }

    const BREVO_SENDER_NAME  = "Chukwuemeka Bullion Exchange";
    const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
    const BREVO_TEMPLATE_ID  = 1;

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
        PHONE: phone,
        EXPERIENCE: experience,
      },
    };

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Registration successful! Your application is pending approval."
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
