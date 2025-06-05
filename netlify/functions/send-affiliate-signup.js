// netlify/functions/send-affiliate-signup.js

const { createClient } = require('@supabase/supabase-js');

// Handler
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseErr) {
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
  const BREVO_KEY = process.env.BREVO_API_KEY;

  if (!SUPA_URL || !SUPA_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.' }),
    };
  }
  if (!BREVO_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing BREVO_API_KEY.' }),
    };
  }

  // Initialize Supabase as admin
  const supabaseAdmin = createClient(SUPA_URL, SUPA_SERVICE_ROLE);

  // 1) Create Auth user
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
      console.error('❌ Supabase createUser error:', authError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authError.message }),
      };
    }
    newUserId = createdUser.id;
  } catch (err) {
    console.error('❌ Exception in createUser:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while creating Auth user.', detail: err.message }),
    };
  }

  // 2) Generate a referral code
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

  // 3) Insert into "affiliates"
  try {
    const { error: insertError } = await supabaseAdmin
      .from('affiliates')
      .insert([{ user_id: newUserId, referral_code: referralCode }]);

    if (insertError) {
      console.error('❌ Supabase insert affiliates error:', insertError);
      // Roll back the auth user since affiliate record failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save affiliate record.', detail: insertError.message }),
      };
    }
  } catch (err) {
    console.error('❌ Exception in affiliates insert:', err);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error while saving affiliate data.', detail: err.message }),
    };
  }

  // 4) Send Brevo email (using global fetch in Node 18)
  const brevoPayload = {
    email: email.trim().toLowerCase(),
    templateId: 10,
    params: {
      FIRSTNAME: email.split('@')[0] || email,
      REFERRAL_CODE: referralCode,
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
    const brevoJson = await response.json();
    if (!response.ok) {
      console.error('❌ Brevo email API error:', brevoJson);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: brevoJson.message || 'Email sending failed.' }),
      };
    }
  } catch (err) {
    console.error('❌ Exception sending email:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Affiliate created, but email sending failed.', detail: err.message }),
    };
  }

  // 5) All done
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Signup successful! Check your inbox for your referral code.',
    }),
  };
};
