// File: api/send-email.js

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { email, name } = req.body;

  // Validate required fields
  if (!email || !name) {
    return res.status(400).json({ message: "Missing email or name" });
  }

  try {
    // Send email via Brevo REST API
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "Bullion Exchange",
          email: "noreply@apexincomeoptions.com.ng"
        },
        to: [{ email: email, name: name }],
        templateId: 4,       // ← Your Brevo template ID
        params: { NAME: name }
      })
    });

    const data = await brevoRes.json();

    if (!brevoRes.ok) {
      // If Brevo returned an error, forward it
      return res.status(500).json({ message: "Brevo API error", details: data });
    }

    // Success
    return res.status(200).json({ message: "Email sent successfully", data });
  } catch (err) {
    // Network or unexpected error
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
