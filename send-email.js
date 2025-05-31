// File: api/send-email.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  const { email, name } = req.body;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Bullion Exchange", email: "noreply@apexincomeoptions.com.ng" },
      to: [{ email: email, name: name }],
      templateId: 4, // Replace with your template ID
      params: { NAME: name }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ message: "Failed to send email", details: data });
  }

  return res.status(200).json({ message: "Email sent successfully", data });
}
