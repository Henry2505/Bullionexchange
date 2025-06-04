// netlify/functions/sendAffiliateSignupEmail.js

import fetch from "node-fetch";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }
  const { email, firstName, token, referralCode } = body;
  if (!email || !firstName || !token || !referralCode) {
    return { statusCode: 400, body: "Missing fields" };
  }

  const confirmationUrl = `https://dapwpgvnfjcfqqhrpxla.supabase.co/auth/v1/verify?token=${token}`;

  const BREVO_API    = process.env.BREVO_API;
  const TEMPLATE_ID  = process.env.BREVO_TEMPLATE_ID;

  if (!BREVO_API || BREVO_API.trim() === "") {
    console.error("❌ Missing BREVO_API");
    return { statusCode: 500, body: "Server misconfigured" };
  }
  if (!TEMPLATE_ID || isNaN(Number(TEMPLATE_ID))) {
    console.error("❌ Missing BREVO_TEMPLATE_ID");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  const payload = {
    sender: { name: "CBE Support", email: "noreply@apexincomeoptions.com.ng" },
    to: [{ email: email, name: firstName }],
    templateId: Number(TEMPLATE_ID),
    params: { firstName, confirmationUrl, referralCode },
  };

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API.trim(),
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Brevo error:", resp.status, data);
      return { statusCode: resp.status, body: JSON.stringify({ error: data }) };
    }
    return { statusCode: 200, body: JSON.stringify({ message: "Email sent" }) };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
