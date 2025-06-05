// netlify/functions/send-application.js

exports.handler = async function(event, context) {
  try {
    // 1) Only accept POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    // 2) Parse the incoming form data
    const body = JSON.parse(event.body);
    const { email, fullname, phone, message } = body || {};

    if (!email || !fullname) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // 3) Example: Insert application data into a Supabase table
    //    (If you want to use @supabase/supabase-js in a function, you can:
    //     const { createClient } = require("@supabase/supabase-js");
    //     const supabase = createClient(SUPA_URL, SUPA_SERVICE_ROLE_KEY);
    //    But if you’re just using fetch against Supabase REST, you can call:
    //     fetch(`${SUPA_URL}/rest/v1/applications`, { ... })
    //    For now, here’s a pseudo‐example of doing a REST call:

    const SUPA_URL     = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
    const SUPA_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        + "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhb24iLCJpYXQiOj..."
                        + "…rest_of_your_anon_or_service_key";
    // If you’re inserting into a “applications” table via REST:
    const insertResponse = await fetch(
      `${SUPA_URL}/rest/v1/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use your anon key if you just want public insert, or service-role key if you need
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`
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

    // 4) (Optional) Send a confirmation email via Brevo (using global fetch)
    //    Example payload – adapt to your template/params:
    const BREVO_API   = process.env.BREVO_API;           // e.g. xkeysib-…
    const TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID;   // e.g. "10"

    if (BREVO_API && TEMPLATE_ID) {
      const emailPayload = {
        sender: {
          name: "CBE Global – Applications",
          email: "noreply@apexincomeoptions.com.ng"
        },
        to: [
          { email, name: fullname }
        ],
        templateId: Number(TEMPLATE_ID),
        params: {
          fullname: fullname,
          message: message || "",
          applicationId: insertData[0]?.id || ""
        }
      };

      // Call Brevo’s SMTP API using global fetch
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
        // We don’t block user if email fails—just log it.
      } else {
        console.log("Brevo queued:", brevoJson);
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
