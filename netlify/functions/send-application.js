// netlify/functions/send-application.js
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' }),
  };
}
if (!BREVO_API_KEY) {
  console.error('❌ Missing BREVO_API_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    };
  }

  const { name, email, password, phone, experience, referral_code } = payload;

  // 1) Basic validation
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Please provide name, email, password, phone, and experience',
      }),
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please supply a valid email address' }),
    };
  }

  if (password.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Password must be at least 8 characters long' }),
    };
  }

  // 2) Check if email exists in public.users
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Failed to verify email availability: ${checkError.message}` }),
      };
    }
    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'This email is already registered' }),
      };
    }
  } catch (err) {
    console.error('Unexpected error while checking existing user:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Database check failed: ${err.message}` }),
    };
  }

  // 3) Validate referral_code
  let validReferredBy = null;
  if (referral_code) {
    try {
      const { data: affRow, error: checkErr } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('referral_code', referral_code)
        .single();

      if (checkErr || !affRow) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid referral code' }),
        };
      }
      validReferredBy = affRow.user_id;
    } catch (err) {
      console.error('Error validating referral code:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Failed to validate referral code: ${err.message}` }),
      };
    }
  }

  // 4) Create Supabase Auth user
  let newAuthUser = null;
  try {
    const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.getUserByEmail(email);
    if (existingAuthUser?.user) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'This email is already registered in authentication' }),
      };
    }
    if (authCheckError && authCheckError.code !== 'user_not_found') {
      console.error('Error checking auth user:', authCheckError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to verify auth user: ${authCheckError.message}' }),
      };
    }

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: name },
    });

    if (authErr) {
      console.error('Error creating Auth user:', authErr);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Failed to create authentication user: ${authErr.message}' }),
      };
    }
    newAuthUser = authData.user;
  } catch (err) {
    console.error('Unexpected error creating Auth user:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Authentication creation failed: ${err.message}' }),
    };
  }

  // 5) Insert into public.users
  try {
    const { error: insertErr } = await supabase
      .from('users')
      .insert([
        {
          id: newAuthUser.id,
          name: name,
          email: email,
          phone: phone,
          experience: experience,
          referral_code: referral_code || null,
          referred_by: validReferredBy,
          status: 'pending',
        },
      ]);

    if (insertErr) {
      console.error('Error inserting into public.users:', insertErr);
      await supabase.auth.admin.deleteUser(newAuthUser.id);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to insert user details: ${insertErr.message}' }),
      };
    }
  } catch (err) {
    console.error('Unexpected error inserting into users:', err);
    await supabase.auth.admin.deleteUser(newAuthUser.id);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database insertion failed: ${err.message}' }),
    };
  }

  // 6) Send confirmation email via Brevo
  const brevoPayload = {
    sender: {
      name: 'Chukwuemeka Bullion Exchange',
      email: 'noreply@apexincomeoptions.com.ng',
    },
    to: [
      {
        email: email,
        name: name,
      },
    ],
    templateId: 1,
    params: {
      NAME: name,
      EMAIL: email,
      PHONE: phone,
      EXPERIENCE: experience,
    },
  };

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!brevoResponse.ok) {
      const brevoResult = await brevoResponse.json();
      console.error('Brevo responded with error:', brevoResponse.status, brevoResult);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Brevo error: ${brevoResult.message || 'Unknown error'}' }),
      };
    }
  } catch (err) {
    console.error('Unexpected error sending Brevo email:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to send confirmation email' }),
    };
  }

  // 7) Success
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Application submitted successfully! A confirmation email has been sent.',
    }),
  };
};
