// netlify/functions/send-testimonial-alert.js

/**
 * This Netlify Function sends a “new testimonial” email (Brevo template ID 4)
 * to all users whenever an approved testimonial’s ID is POSTed here.
 *
 * Environment variables you must set in Netlify:
 *   SUPABASE_URL       = https://dapwpgvnfjcfqqhrpxla.supabase.co
 *   SUPABASE_ANON_KEY  = <your Supabase anon key>
 *   BREVO_API_KEY      = xkeysib-<your actual Brevo key>
 */

const { createClient } = require("@supabase/supabase-js");

// Handler entrypoint
exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const testimonialId = body.id;
  if (!testimonialId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: id" }),
    };
  }

  // Read environment variables
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables are not set.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase not configured." }),
    };
  }
  if (!BREVO_API_KEY) {
    console.error("BREVO_API_KEY is not set.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Brevo not configured." }),
    };
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1) Fetch the newly-approved testimonial’s author and text
    const { data: tData, error: tErr } = await supabase
      .from("testimonials")
      .select("name,testimonial_text")
      .eq("id", testimonialId)
      .single();
    if (tErr || !tData) {
      console.warn(
        `Could not fetch testimonial #${testimonialId}:`,
        tErr?.message || "Not found"
      );
      // We can still proceed with a generic message, but we’ll log this.
    }

    const testimonialAuthor = tData?.name || "A member";
    const testimonialText = tData?.testimonial_text || "";

    // 2) Fetch all users (we'll notify everyone)
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("name,email")
      .neq("email", null);
    if (usersErr || !users || users.length === 0) {
      console.error("No users found or error fetching users:", usersErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to load users." }),
      };
    }

    // 3) Build & send a Brevo email to each user with templateId=4
    const BREVO_SENDER = {
      name: "Chukwuemeka Bullion Exchange",
      email: "noreply@apexincomeoptions.com.ng",
    };
    const TEMPLATE_ID = 4;

    // Loop through users and send one request per user
    const sendPromises = users.map(async (u) => {
      const payload = {
        sender: BREVO_SENDER,
        to: [
          {
            email: u.email,
            name: u.name,
          },
        ],
        templateId: TEMPLATE_ID,
        params: {
          contact: {
            FIRSTNAME: u.name,
            EMAIL: u.email,
          },
          testimonial_author: testimonialAuthor,
          testimonial_snippet: testimonialText.slice(0, 100), // first 100 chars
          unsubscribe: "https://apexincomeoptions.com.ng/unsubscribe-link",
        },
      };

      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          console.error(
            `Brevo error for ${u.email}:`,
            res.status,
            json || "(no JSON response)"
          );
        }
      } catch (err) {
        console.error(`Fetch error sending to ${u.email}:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "All users notified of new testimonial." }),
    };
  } catch (err) {
    console.error("Unexpected error in send-testimonial-alert:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
