// netlify/functions/send-application.js

const { createClient } = require("@supabase/supabase-js");

// If you named this file “send-application.js”, Netlify’s URL will be: /.netlify/functions/send-application
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
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

  // Pull out everything, including referral_code
  const { name, email, password, phone, experience, referral_code } = data;
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields." }),
    };
  }

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
    // 1) Reject if the email is already in “users”
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

    // 2) Insert into “users”, including referral_code (if provided)
    const insertPayload = {
      name,
      email,
      password,
      phone,
      experience,
      status: "pending",
      // If referral_code is null, that’s fine; it will save null.
      referral_code: referral_code || null,
    };

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

    // 3) Email the user via Brevo
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
    const BREVO_TEMPLATE_ID  = 1; // replace with your actual template ID

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

    // 4) Everything succeeded
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Registration successful! Your application is pending approval.",
      }),
    };
  } catch (err) {
    console.error("Unexpected error in send-application function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
