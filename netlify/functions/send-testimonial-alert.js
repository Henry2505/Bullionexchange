const fetch = require("node-fetch"); // CommonJS for Netlify
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  try {
    const { id } = JSON.parse(event.body || "{}");

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing testimonial ID" }),
      };
    }

    // Fetch testimonial details
    const { data: testimonial, error } = await supabase
      .from("testimonials")
      .select("email")
      .eq("id", id)
      .single();

    if (error || !testimonial) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Testimonial not found" }),
      };
    }

    // Send email via Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Apex Income Options", email: "noreply@apexincomeoptions.com.ng" },
        to: [{ email: testimonial.email }],
        templateId: 4,
        params: {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to send email", details: errorData }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message }),
    };
  }
};
