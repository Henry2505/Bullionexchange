// netlify/functions/send-application.js

exports.handler = async function(event, context) {
  try {
    // 1) Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    // 2) Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
      };
    }
    const { name, email, password, phone, experience, referral_code, referred_by } = body;
    if (!name || !email || !password || !phone || !experience) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // 3) Ensure SUPA_KEY is set
    const SUPA_URL = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
    const SUPA_KEY = process.env.SUPA_KEY;
    if (!SUPA_KEY) {
      console.error("Missing SUPA_KEY env var");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // 4) Insert into our custom 'users' table (or whatever your apply table is).
    //    We assume you have a table called "users" with columns matching these fields.
    //    If you instead use "@supabase/supabase-js", swap this out accordingly.
    const insertResponse = await fetch(
      `${SUPA_URL}/rest/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          full_name: name,
          email: email.toLowerCase(),
          password: password,
          phone: phone,
          experience: experience,
          referral_code: referral_code || null,
          referred_by: referred_by || null
        })
      }
    );
    const insertData = await insertResponse.json();
    if (!insertResponse.ok) {
      console.error("Supabase insert error:", insertData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Database error saving application" }),
      };
    }

    // 5) Optionally send a confirmation email via Brevo
    const BREVO_API   = process.env.BREVO_API;
    const TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID;
    if (BREVO_API && TEMPLATE_ID) {
      const emailPayload = {
        sender: {
          name: "CBE Global – Applications",
          email: "noreply@apexincomeoptions.com.ng"
        },
        to: [{ email: email.toLowerCase(), name: name }],
        templateId: Number(TEMPLATE_ID),
        params: {
          fullname: name,
          applicationId: insertData[0]?.id || "",
          referral_code: referral_code || ""
        }
      };

      try {
        const brevoResp = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API.trim()
          },
          body: JSON.stringify(emailPayload)
        });
        const brevoJson = await brevoResp.json();
        if (!brevoResp.ok) {
          console.error("Brevo send error:", brevoJson);
        } else {
          console.log("✅ Brevo email queued:", brevoJson);
        }
      } catch (brevoErr) {
        console.error("Error calling Brevo:", brevoErr);
      }
    }

    // 6) Return success to client
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Application saved successfully", data: insertData }),
    };

  } catch (err) {
    console.error("Unhandled error in send-application:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
