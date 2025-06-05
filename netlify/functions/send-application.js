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

    // 2) Parse JSON body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
      };
    }

    const {
      name,
      email,
      password,
      phone,
      experience,
      referral_code,
      referred_by
    } = body;

    // 3) Required fields
    if (!name || !email || !password || !phone || !experience) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // 4) Check SUPA_KEY
    const SUPA_URL = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
    const SUPA_KEY = process.env.SUPA_KEY;
    if (!SUPA_KEY) {
      console.error("❌ Missing SUPA_KEY env var");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // 5) Attempt to insert into public.users via REST
    const insertResp = await fetch(
      `${SUPA_URL}/rest/v1/users`, 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          // “Prefer: return=representation” returns the new row if successful
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

    const insertData = await insertResp.json();

    if (!insertResp.ok) {
      // Log the exact Supabase error so you can see why it failed
      console.error("❌ Supabase insert error:", insertData);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Database error saving application",
          details: insertData
        }),
      };
    }

    // 6) If we want, send a Brevo email (optional)
    const BREVO_API    = process.env.BREVO_API;
    const TEMPLATE_ID  = process.env.BREVO_TEMPLATE_ID;
    if (BREVO_API && TEMPLATE_ID) {
      // Build the Brevo payload—adjust “params” to what your template expects
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
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API.trim()
          },
          body: JSON.stringify(emailPayload)
        });
        const brevoJson = await brevoRes.json();
        if (!brevoRes.ok) {
          console.error("❌ Brevo error:", brevoJson);
        } else {
          console.log("✅ Brevo email queued:", brevoJson);
        }
      } catch (brevoErr) {
        console.error("❌ Error calling Brevo:", brevoErr);
      }
    }

    // 7) Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Application saved successfully",
        data: insertData
      }),
    };

  } catch (err) {
    console.error("❌ Unhandled error in send-application:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
