import fetch from 'node-fetch';

export async function handler(event) {
  try {
    const { email, userId, templateId } = JSON.parse(event.body);

    const payload = {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL, // e.g. 'no-reply@yourdomain.com'
        name:  process.env.BREVO_SENDER_NAME   // e.g. 'CBE Exchange'
      },
      to: [{ email }],
      templateId,
      params: { userId }
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    console.log('Brevo response:', result);   // <-- log it for debugging!

    if (!resp.ok) {
      // now you’ll see exactly what Brevo complained about in your logs
      return { statusCode: resp.status, body: JSON.stringify(result) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent' })
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
