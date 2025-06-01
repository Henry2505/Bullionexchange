import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_ANON_KEY")
);

export default async (request) => {
  try {
    const { id: testimonialId } = await request.json();

    if (!testimonialId) {
      return new Response(JSON.stringify({ error: "Missing testimonial ID" }), { status: 400 });
    }

    // 1. Fetch approved testimonial
    const { data: testimonial, error: testimonialError } = await supabase
      .from("testimonials")
      .select("*")
      .eq("id", testimonialId)
      .eq("status", "approved")
      .single();

    if (testimonialError || !testimonial) {
      return new Response(JSON.stringify({ error: "Approved testimonial not found" }), { status: 404 });
    }

    // 2. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("email");

    if (usersError) {
      return new Response(JSON.stringify({ error: "Error fetching users", details: usersError }), { status: 500 });
    }

    // 3. Send Brevo email to all users
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const brevoEndpoint = "https://api.brevo.com/v3/smtp/email";

    const sendToAll = users.map((user) =>
      fetch(brevoEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoKey,
        },
        body: JSON.stringify({
          to: [{ email: user.email }],
          templateId: 4,
          params: {}, // Add template params if needed
        }),
      })
    );

    const results = await Promise.allSettled(sendToAll);
    const failedEmails = results
      .map((r, i) => (r.status === "rejected" ? users[i].email : null))
      .filter(Boolean);

    return new Response(JSON.stringify({
      message: "Emails sent",
      failedEmails,
      totalSent: users.length - failedEmails.length,
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: error.message }), { status: 500 });
  }
};
