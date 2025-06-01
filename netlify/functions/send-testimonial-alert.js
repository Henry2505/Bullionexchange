const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables from Netlify
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Testimonial ID is required" }),
      };
    }

    const { data: testimonial, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !testimonial) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Testimonial not found" }),
      };
    }

    const emailData = {
      sender: { name: "Apex Income", email: "noreply@apexincomeoptions.com.ng" },
      to: [{ email: testimonial.email }],
      templateId: 4, // Brevo template ID
      params: {
        name: testimonial.name,
        link: "https://apexincomeoptions.com.ng/login", // Login to view the testimonial
      },
    };

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(emailData),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text();
      return {
        statusCode: brevoRes.status,
        body: JSON.stringify({ error: "Brevo failed", details: errorText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal error", details: err.message }),
    };
  }
};
