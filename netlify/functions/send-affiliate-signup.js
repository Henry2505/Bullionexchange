// netlify/functions/send-affiliate-signup.js

// (1) No need to import 'node-fetch'—Netlify’s Node 18 runtime provides a global fetch.
// const fetch = require('node-fetch');

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body.' }),
    };
  }

  const { email, password } = body;
  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing email or password.' }),
    };
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
  const BREVO_KEY = process.env.BREVO_API_KEY || process.env.BREVO_API;

  if (!SUPA_URL || !SUPA_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase URL or Service Role Key.' }),
    };
  }
  if (!BREVO_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Brevo API Key.' }),
    };
  }

  const supabaseAdmin = createClient(SUPA_URL, SUPA_SERVICE_ROLE);

  let newUserId;
  try {
    const {
      data: { user: createdUser },
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      email_confirm_insecure: true,
    });

    if (authError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: authError.message || 'Failed to create auth user.',
        }),
      };
    }
    newUserId = createdUser.id;
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while creating Auth user.' }),
    };
  }

  function generateReferralCode() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  const referralCode = generateReferralCode();

  try {
    const { error: insertError } = await supabaseAdmin
      .from('affiliates')
      .insert([
        {
          user_id: newUserId,
          referral_code: referralCode,
        },
      ]);

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: insertError.message || 'Failed to save affiliate record.',
        }),
      };
    }
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while saving affiliate data.' }),
    };
  }

  const brevoPayload = {
    email: email.trim().toLowerCase(),
    templateId: 10,
    params: {
      FIRSTNAME: email.split('@')[0] || email,
      REFERRAL_CODE: referralCode,
    },
  };

  try {
    // Use the global `fetch`—no need for node-fetch
    const brevoResponse = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_KEY,
        },
        body: JSON.stringify(brevoPayload),
      }
    );
    const brevoJson = await brevoResponse.json();
    if (!brevoResponse.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: brevoJson.message || 'Email sending failed.',
        }),
      };
    }
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: 'Affiliate created, but email sending failed (network).',
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Signup successful! Check your inbox for your referral code.',
    }),
  };
};
