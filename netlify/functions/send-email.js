// netlify/functions/send-email.js
import fetch from 'node-fetch';

export async function handler(event) {
  try {
    // 1. Parse your incoming body
    const { email, userId, templateId } = JSON.parse(event.body);

    // 2. Build Brevo’s expected payload shape
    const payload = {
      templateId: templateId,
      to: [{ email }],          // ← must be an array of { email }
      params: { userId }         // ← optional, any template vars go here
    };

    // 3. Send to Brevo
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,    // ← set this in Netlify UI
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (!resp.ok) {
      // propagate Brevo’s error message
      return { statusCode: resp.status, body: JSON.stringify(result) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
