// netlify/functions/send-application.js

/**
 * 1) Validates POST payload
 * 2) Checks “users” table for existing email
 * 3) Verifies referral_code (if provided) by looking up affiliates → gets affiliate.user_id
 * 4) Hashes password (optional) or stores raw
 * 5) Inserts new row into Supabase `users` with status="pending" and referred_by=affiliate_id
 * 6) Sends a confirmation email via Brevo
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ─── Environment variables (set these in Netlify’s Settings → Build & Deploy → Environment) ───
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}
if (!BREVO_API_KEY) {
  console.error('❌ Missing BREVO_API_KEY');
}

// Initialize Supabase client with Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // Parse JSON payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload.' }),
    };
  }

  const { name, email, password, phone, experience, referral_code } = payload;

  // ─── 1) Basic server-side validation ───────────────────────────────────────────────
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Please provide name, email, password, phone, and experience.',
      }),
    };
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please supply a valid email address.' }),
    };
  }

  // Password length check
  if (password.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Password must be at least 8 characters long.' }),
    };
  }

  // ─── 2) Check if email already exists in "users" ──────────────────────────────────
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
        body: JSON.stringify({ error: 'Failed to verify email availability.' }),
      };
    }
    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'This email is already registered.' }),
      };
    }
  } catch (err) {
    console.error('Unexpected error while checking existing user:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database check failed.' }),
    };
  }

  // ─── 3) If referral_code provided, verify it in "affiliate_accounts" ───────────────────────
let referredByUserId = null;
if (referral_code) {
  // 1) normalize to uppercase
  const code = referral_code.trim().toUpperCase();
  console.log('🔍 [send-application] validating referral_code:', code);

  try {
    // 2) use the same table your front-end writes to
    const { data: affRow, error: checkErr } = await supabase
      .from('affiliate_accounts')         // ← was "affiliates"
      .select('user_id')
      .eq('referral_code', code)          // exact match against uppercase codes
      .single();

    console.log('↩️ [send-application] supabase reply:', { affRow, checkErr });
    if (checkErr || !affRow) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid referral code.' }),
      };
    }
    referredByUserId = affRow.user_id;
  } catch (err) {
    console.error('Error validating referral code:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to validate referral code.' }),
    };
  }
}

  // ─── 4) Hash the password (optional) ────────────────────────────────────────────────
  // Uncomment the below lines if you want to store a hashed password:
  //
  // let pwToStore = password;
  // try {
  //   const hash = crypto.createHash('sha256');
  //   hash.update(password);
  //   pwToStore = hash.digest('base64');
  // } catch (hashErr) {
  //   console.error('Password hashing error:', hashErr);
  //   return {
  //     statusCode: 500,
  //     body: JSON.stringify({ error: 'Error hashing password.' }),
  //   };
  // }
  //
  // Or just store the raw password if that’s your preference:
  const pwToStore = password;

  // ─── 5) Insert new user into `users` table ─────────────────────────────────────────
  let newUser;
  try {
    const { data, error: insertErr } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: pwToStore,
          phone,
          experience,
          referred_by: referredByUserId, // ← store affiliate’s user_id here
          status: 'pending',             // ensure `users` table has a "status" column
        },
      ])
      .single();

    if (insertErr) {
      console.error('Supabase insert error:', insertErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: insertErr.message || 'Failed to submit application.' }),
      };
    }
    newUser = data;
  } catch (err) {
    console.error('Unexpected error during insert:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database insertion failed.' }),
    };
  }

  // ─── 6) Send confirmation email via Brevo ────────────────────────────────────────
  if (!BREVO_API_KEY) {
    console.error('Missing BREVO_API_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured.' }),
    };
  }

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
    templateId: 1, // ← Adjust this to your actual Brevo template ID
    params: {
      NAME: name,
      EMAIL: email,
      PHONE: phone,
      EXPERIENCE: experience,
    },
  };

  try {
    // Netlify/Node 18+ provides a global `fetch`
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    let brevoResult = null;
    try {
      brevoResult = await brevoResponse.json();
    } catch (jsonErr) {
      console.warn('Could not parse Brevo response JSON:', jsonErr);
    }

    if (!brevoResponse.ok) {
      console.error('Brevo responded with error:', brevoResponse.status, brevoResult);
      const brevoMsg = brevoResult?.message || brevoResult?.error || 'Unknown Brevo error';
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Brevo error: ' + brevoMsg }),
      };
    }
  } catch (err) {
    console.error('Unexpected error sending Brevo email:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to send confirmation email.' }),
    };
  }

  // ─── 7) Success ───────────────────────────────────────────────────────────────────
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Application submitted successfully! A confirmation email has been sent.',
    }),
  };
};
