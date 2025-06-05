// netlify/functions/send-affiliate-signup.js

/**
 * 1) Creates a Supabase Auth user (using the Service Role key).
 * 2) Generates an 8‑character referral_code.
 * 3) Inserts a row into public.affiliates (user_id, referral_code, created_at).
 * 4) Sends a transactional “Welcome Affiliate” email via Brevo (templateId: 10).
 *
 * Expects POST JSON body:
 * {
 *   email: "<user email>",
 *   password: "<plaintext password>"
 * }
 *
 * Response on success:
 *   { message: "Signup successful! Check your inbox for details." }
 *
 * On error:
 *   { error: "<description>" }
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  // 1) Parse incoming JSON body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body.' })
    };
  }

  const { email, password } = body;
  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing email or password.' })
    };
  }

  // 2) Read environment variables
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
  const BREVO_KEY = process.env.BREVO_API_KEY;

  if (!SUPA_URL || !SUPA_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase URL or Service Role Key not configured.' })
    };
  }
  if (!BREVO_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Brevo API Key not configured.' })
    };
  }

  // 3) Initialize Supabase client (admin) with Service Role key
  const supabaseAdmin = createClient(SUPA_URL, SUPA_SERVICE_ROLE);

  let newUserId;
  try {
    // 4) Create new Auth user
    const { data: { user: createdUser }, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      email_confirm_insecure: true
    });

    if (authErr) {
      console.error('Supabase Auth error:', authErr);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authErr.message || 'Failed to create auth user.' })
      };
    }
    newUserId = createdUser.id;
  } catch (err) {
    console.error('Unexpected Supabase auth exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while creating Auth user.' })
    };
  }

  // 5) Generate an 8‑character alphanumeric referral code
  function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  let referralCode = generateReferralCode();

  // 6) Insert into public.affiliates
  try {
    const { error: insertErr } = await supabaseAdmin
      .from('affiliates')
      .insert([
        {
          user_id: newUserId,
          referral_code: referralCode
        }
      ]);

    if (insertErr) {
      console.error('Supabase insert error (affiliates):', insertErr);
      // Roll back the Auth user if insertion fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: insertErr.message || 'Failed to save affiliate record.' })
      };
    }
  } catch (err) {
    console.error('Unexpected insert exception (affiliates):', err);
    // Roll back the Auth user
    await supabaseAdmin.auth.admin.deleteUser(newUserId);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while saving affiliate data.' })
    };
  }

  // 7) Send Brevo email (templateId: 10)
  const brevoPayload = {
    email: email.trim().toLowerCase(),
    templateId: 10, // Use your “Affiliate Welcome” template in Brevo
    params: {
      FIRSTNAME: email.split('@')[0],    // e.g. use part before “@” as placeholder
      REFERRAL_CODE: referralCode
    }
  };

  try {
    const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_KEY
      },
      body: JSON.stringify(brevoPayload)
    });
    const brevoJson = await brevoResp.json();
    if (!brevoResp.ok) {
      console.error('Brevo API error:', brevoJson);
      // We do NOT roll back the affiliate in case the email fails
      return {
        statusCode: 502,
        body: JSON.stringify({ error: brevoJson.message || 'Affiliate created, but email send failed.' })
      };
    }
  } catch (err) {
    console.error('Brevo fetch exception:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Affiliate created, but email send failed (network).' })
    };
  }

  // 8) Success
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Signup successful! Check your inbox.' })
  };
};
