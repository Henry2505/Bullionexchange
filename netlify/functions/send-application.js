// netlify/functions/send-application.js

/**
 * This function expects a POST with JSON fields:
 *   {
 *     name: string,
 *     email: string,
 *     password: string,
 *     phone: string,
 *     experience: string,
 *     referral_code: string | null,
 *     referred_by: string (UUID) | null
 *   }
 *
 * It will:
 *   1) Create a Supabase Auth user (so they can log in later)
 *   2) Insert the same information into public.users (so your referrals + earnings jump‐trigger works)
 *   3) Optionally queue a Brevo email (templateId=10, using BREVO_API key)
 *   4) Return 200 if everything succeeded, or 4xx/5xx otherwise.
 */

const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  try {
    // Only POST is allowed
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Parse JSON body
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
      referred_by,
    } = body;

    // Validate required fields
    if (!name || !email || !password || !phone || !experience) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields." }),
      };
    }

    // Load environment variables
    const SUPA_URL = "https://dapwpgvnfjcfqqhrpxla.supabase.co";
    const SUPA_KEY = process.env.SUPA_KEY; // This must be your Supabase service‐role key
    const BREVO_API = process.env.BREVO_API; // your Brevo API key
    const BREVO_TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID; // e.g. "10"

    if (!SUPA_KEY) {
      console.error("❌ Missing SUPA_KEY env var");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // ----------------------------------------------------
    // 1) Create a Supabase Auth user
    // ----------------------------------------------------
    // We do this via Supabase’s Admin (service‐role) REST endpoint:
    const signUpResp = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // auto‐confirm to avoid email confirmations
      }),
    });

    const signUpJson = await signUpResp.json();
    if (!signUpResp.ok) {
      console.error("❌ Supabase Auth error:", signUpJson);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Failed to create authentication user.",
          details: signUpJson,
        }),
      };
    }

    // We now have a new Auth user.  Grab their “id” (UUID).
    const newAuthUserId = signUpJson.id;
    console.log("✅ Auth user created with id:", newAuthUserId);

    // ----------------------------------------------------
    // 2) Insert into public.users (profile table)
    // ----------------------------------------------------
    const insertResp = await fetch(`${SUPA_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        Prefer: "return=representation", // returns the inserted row
      },
      body: JSON.stringify({
        id: newAuthUserId,           // use the same UUID as Auth
        full_name: name,
        email: email.toLowerCase(),
        password: password,
        phone: phone,
        experience: experience,
        referral_code: referral_code || null,
        referred_by: referred_by || null,
        // created_at will be filled automatically by DEFAULT NOW()
      }),
    });

    const insertJson = await insertResp.json();
    if (!insertResp.ok) {
      console.error("❌ Supabase insert error:", insertJson);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Database error saving application",
          details: insertJson,
        }),
      };
    }

    console.log("✅ Inserted into public.users:", insertJson);

    // ----------------------------------------------------
    // 3) Optionally queue a Brevo email (if creds provided)
    // ----------------------------------------------------
    if (BREVO_API && BREVO_TEMPLATE_ID) {
      try {
        const brevoPayload = {
          sender: {
            name: "CBE Global – Applications",
            email: "noreply@apexincomeoptions.com.ng",
          },
          to: [{ email: email.toLowerCase(), name: name }],
          templateId: Number(BREVO_TEMPLATE_ID),
          params: {
            fullname: name,
            applicationId: insertJson[0]?.id || "",
            referral_code: referral_code || "",
            // any other dynamic params your Brevo template needs
          },
        };
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API.trim(),
          },
          body: JSON.stringify(brevoPayload),
        });
        const brevoJson = await brevoRes.json();
        if (!brevoRes.ok) {
          console.error("❌ Brevo error response:", brevoJson);
        } else {
          console.log("✅ Brevo email queued:", brevoJson);
        }
      } catch (brevoErr) {
        console.error("❌ Error calling Brevo:", brevoErr);
      }
    }

    // ----------------------------------------------------
    // 4) Everything succeeded → return success message
    // ----------------------------------------------------
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Application saved successfully.",
        data: insertJson,
      }),
    };
  } catch (unhandledErr) {
    console.error("❌ Unhandled error in send-application:", unhandledErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
