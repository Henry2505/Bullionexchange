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
    const { email, fullname, phone, message } = body;
    if (!email || !fullname || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // 3) Insert into Supabase via REST
    const SUPA_URL = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
    const SUPA_KEY = process.env.SUPA_KEY; 
    // Make sure you’ve set SUPA_KEY in Netlify (either anon or service‐role key)
    if (!SUPA_KEY) {
      console.error("Missing SUPA_KEY env var");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    const insertResponse = await fetch(
      `${SUPA_URL}/rest/v1/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ email, fullname, phone, message })
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

    // 4) Send confirmation email via Brevo (optional)
    const BREVO_API    = process.env.BREVO_API;          
    const TEMPLATE_ID  = process.env.BREVO_TEMPLATE_ID;
    if (BREVO_API && TEMPLATE_ID) {
      const emailPayload = {
        sender: {
          name: "CBE Global – Applications",
          email: "noreply@apexincomeoptions.com.ng"
        },
        to: [
          { email: email, name: fullname }
        ],
        templateId: Number(TEMPLATE_ID),
        params: {
          fullname: fullname,
          message: message || "",
          applicationId: insertData[0]?.id || ""
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
          // Don’t block the user—just log if email fails
        } else {
          console.log("✅ Brevo queued:", brevoJson);
        }
      } catch (brevoErr) {
        console.error("Brevo fetch error:", brevoErr);
      }
    }

    // 5) Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Application received", data: insertData }),
    };

  } catch (err) {
    console.error("Unhandled error in send-application:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
