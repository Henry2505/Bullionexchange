// netlify/functions/send-affiliate-signup.js

/**
 * - Creates a new Supabase Auth user (Service Role key).
 * - Generates an 8‑character referral_code.
 * - Inserts into public.affiliates (user_id, referral_code, created_at).
 * - Sends a Brevo email using templateId 10.
 *
 * Expects POST JSON: { email: string, password: string }
 * Returns 200 { message: "Signup successful! Check your inbox." }
 * or an error JSON { error: "<description>" } with appropriate status code.
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // 1) Parse JSON body
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

  // 2) Read environment variables
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

  // 3) Initialize Supabase admin client
  const supabaseAdmin = createClient(SUPA_URL, SUPA_SERVICE_ROLE);

  let newUserId;
  try {
    // 4) Create the Auth user
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
      console.error('Supabase auth error:', authError);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: authError.message || 'Failed to create auth user.',
        }),
      };
    }
    newUserId = createdUser.id;
  } catch (err) {
    console.error('Unexpected Supabase auth exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while creating Auth user.' }),
    };
  }

  // 5) Generate a random referral code (8 alphanumeric chars)
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

  // 6) Insert into public.affiliates
  try {
    const { error: insertError } = await supabaseAdmin.from('affiliates').insert([
      {
        user_id: newUserId,
        referral_code: referralCode,
      },
    ]);

    if (insertError) {
      console.error('Supabase insert error (affiliates):', insertError);
      // Roll back the Auth user if insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: insertError.message || 'Failed to save affiliate record.',
        }),
      };
    }
  } catch (err) {
    console.error('Unexpected insert exception (affiliates):', err);
    // Roll back the Auth user
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while saving affiliate data.' }),
    };
  }

  // 7) Send a Brevo email using templateId 10
  const brevoPayload = {
    email: email.trim().toLowerCase(),
    templateId: 10,
    params: {
      FIRSTNAME: email.split('@')[0] || email,
      REFERRAL_CODE: referralCode,
    },
  };

  try {
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
      console.error('Brevo API error:', brevoJson);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: brevoJson.message || 'Affiliate created, but email sending failed.',
        }),
      };
    }
  } catch (err) {
    console.error('Brevo fetch exception:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: 'Affiliate created, but email sending failed (network).',
      }),
    };
  }

  // 8) All done successfully
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Signup successful! Check your inbox for your referral code.',
    }),
  };
};
