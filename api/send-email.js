// /api/send-email.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ message: 'Missing email or name' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,  // Set this in Vercel dashboard
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Bullion Exchange', email: 'noreply@apexincomeoptions.com.ng' },
        to: [{ email: email, name: name }],
        templateId: 4,  // Your Brevo Template ID
        params: { name }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ message: 'Brevo error', details: errorText });
    }

    return res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
