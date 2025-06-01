// netlify/functions/send-testimonial-alert.js

/**
 * This Netlify Function is called when a testimonial’s status flips to "approved".
 * It receives { id: <testimonial_id> } in the POST body. It then:
 *   1) Looks up the testimonial in Supabase (e.g. to get the submitter’s name),
 *      if you want to include that as a template parameter.
 *   2) Fetches all users’ emails & names from the "users" table.
 *   3) Loops through them and sends a Brevo transactional email (templateId: 4)
 *      to each user, using only template variables (no raw subject/body).
 *
 * Required Netlify environment variable:
 *   BREVO_API_KEY = xkeysib-<YOUR_ACTUAL_KEY>   (your Brevo transactional key)
 *   SUPABASE_URL  = https://dapwpgvnfjcfqqhrpxla.supabase.co
 *   SUPABASE_ANON_KEY = <your anon key>
 */

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // 1) Parse the incoming JSON body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
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

  // 2) Initialize Supabase
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase not configured." }),
    };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 3) (Optional) Fetch the newly-approved testimonial itself
    //    in case you want to include the submitter’s name in the template.
    const { data: testimonialData, error: testimonialErr } = await supabase
      .from("testimonials")
      .select("name,testimonial_text")
      .eq("id", testimonialId)
      .single();
    if (testimonialErr || !testimonialData) {
      console.warn(
        "Could not fetch testimonial #" + testimonialId + " →",
        testimonialErr
      );
      // We’ll continue anyway, sending a generic “new testimonial” alert.
    }

    // 4) Fetch all users from "users" table
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("email,name")
      // Optionally, only notify "approved" users:
      // .eq("status", "approved")
      .order("created_at", { ascending: true });
    if (usersErr || !users || users.length === 0) {
      console.error("No users found or error fetching users →", usersErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to load users." }),
      };
    }

    // 5) Read Brevo API key from env
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Brevo not configured." }),
      };
    }

    // 6) For each user, send a Brevo email using templateId=4
    //    (You could also batch them in one request if you prefer.)
    const BREVO_SENDER_NAME  = "Chukwuemeka Bullion Exchange";
    const BREVO_SENDER_EMAIL = "noreply@apexincomeoptions.com.ng";
    const BREVO_TEMPLATE_ID  = 4;

    // If your template expects e.g. {{ params.FIRSTNAME }} or {{ params.TESTIMONIALER }},
    // we can pass both. Here's how:
    const promises = users.map(async (u) => {
      const brevoPayload = {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: u.email,
            name: u.name,
          },
        ],
        templateId: BREVO_TEMPLATE_ID,
        params: {
          // The template variables must exactly match what you set up in Brevo.
          FIRSTNAME: u.name,
          TESTIMONIALER: testimonialData?.name || "A fellow trader",
        },
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify(brevoPayload),
      });

      let json = null;
      try {
        json = await res.json();
      } catch (_) {
        // no JSON
      }
      if (!res.ok) {
        console.error(
          `Brevo error sending to ${u.email}:`,
          res.status,
          json
        );
        // We do NOT throw here; we log and continue to next user.
      }
    });

    // 7) Wait for all emails to be enqueued
    await Promise.all(promises);

    // 8) Return success
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
