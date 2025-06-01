const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

exports.handler = async (event) => {
  console.log("🔔 Function send-testimonial-alert triggered");

  if (event.httpMethod !== "POST") {
    console.log("⛔ Invalid HTTP method:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log("✅ Received body:", body);
  } catch (err) {
    console.log("⛔ JSON parse error:", err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const testimonialId = body.id;
  if (!testimonialId) {
    console.log("⛔ No testimonial ID provided");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: id" }),
    };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !BREVO_API_KEY) {
    console.log("⛔ Missing environment variables");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase or Brevo not configured." }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. Fetch the testimonial
    const { data: testimonial, error: testimonialError } = await supabase
      .from("testimonials")
      .select("name, testimonial_text")
      .eq("id", testimonialId)
      .single();

    if (testimonialError) {
      console.log("⛔ Supabase error fetching testimonial:", testimonialError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch testimonial." }),
      };
    }

    const testimonialAuthor = testimonial?.name || "A member";
    const testimonialSnippet = testimonial?.testimonial_text?.slice(0, 100) || "";

    console.log("✅ Testimonial fetched:", testimonialAuthor);

    // 2. Fetch all users with valid emails
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("name, email")
      .neq("email", null);

    if (usersError) {
      console.log("⛔ Supabase error fetching users:", usersError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch users." }),
      };
    }

    console.log(`📨 Preparing to notify ${users.length} users`);

    const BREVO_SENDER = {
      name: "Chukwuemeka Bullion Exchange",
      email: "noreply@apexincomeoptions.com.ng",
    };

    const TEMPLATE_ID = 4;

    const sendResults = await Promise.allSettled(
      users.map(async (user) => {
        const emailPayload = {
          sender: BREVO_SENDER,
          to: [{ email: user.email, name: user.name }],
          templateId: TEMPLATE_ID,
          params: {
            contact: { FIRSTNAME: user.name, EMAIL: user.email },
            testimonial_author: testimonialAuthor,
            testimonial_snippet: testimonialSnippet,
            unsubscribe: "https://apexincomeoptions.com.ng/unsubscribe",
          },
        };

        try {
          const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": BREVO_API_KEY,
            },
            body: JSON.stringify(emailPayload),
          });

          const resData = await response.json();

          if (!response.ok) {
            console.log(`⛔ Brevo error [${response.status}] for ${user.email}:`, resData);
          } else {
            console.log(`✅ Email sent to ${user.email}`);
          }
        } catch (error) {
          console.log(`⛔ Failed to send email to ${user.email}:`, error.message);
        }
      })
    );

    console.log("🎉 Email send process completed");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "All users notified of new testimonial." }),
    };
  } catch (error) {
    console.log("⛔ Function error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
