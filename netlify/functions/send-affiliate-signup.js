// netlify/functions/sendAffiliateSignupEmail.js

/**
 * This function receives POST requests from the signup page:
 *    { email: "<userEmail>", name: "<userName>", templateId: 10 }
 *
 * It then calls Brevo’s /smtp/email endpoint to send Template 10.
 */

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const { email, name, templateId } = body;
  if (!email || !templateId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  // Brevo API key must be stored as an ENV var in Netlify (Settings → Env vars)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Brevo API Key on server.' }),
    };
  }

  // Build the Brevo request payload
  const brevoPayload = {
    email: email,
    templateId: templateId,    // ← We use "10" here, as requested
    params: {
      FIRSTNAME: name || '',   // If you want to personalize with name, pass it; else empty
      // You can add more template variables here if your Template 10 expects them
    },
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_KEY,
      },
      body: JSON.stringify(brevoPayload),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', json);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: json.message || 'Failed to send email via Brevo',
        }),
      };
    }

    // Success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Welcome email sent successfully.',
        brevoResponse: json,
      }),
    };
  } catch (err) {
    console.error('Error calling Brevo:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error sending email.' }),
    };
  }
};
