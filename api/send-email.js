export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { name, email } = req.body;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "CBE", email: "noreply@apexincomeoptions.com.ng" },
      to: [{ email, name }],
      templateId: 4,
      params: { name }
    }),
  });

  const data = await response.json();
  res.status(200).json(data);
}
