// netlify/functions/send-application.js

/**
 * This single function will:
 * 1) Validate the incoming POST payload
 * 2) Check for existing email in `users` (to avoid duplicates)
 * 3) Verify referral_code (if provided)
 * 4) Hash the password with SHA-256
 * 5) Insert into Supabase `users` table with status "pending"
 * 6) Send a confirmation email via Brevo
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fetch = require('node-fetch'); // Import node-fetch for sending the Brevo request

// Initialize Supabase client with Service Role key (must be stored as an ENV var on Netlify)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Brevo (Sendinblue) configuration (must be set on Netlify as BREVO_API_KEY)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_NAME = 'Chukwuemeka Bullion Exchange';
const BREVO_SENDER_EMAIL = 'noreply@apexincomeoptions.com.ng';
const BREVO_TEMPLATE_ID = 1; // Adjust to your actual Brevo template ID

exports.handler = async (event, context) => {
  // Only accept POST
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
      body: JSON.stringify({ error: 'Invalid JSON payload.' }),
    };
  }

  const { name, email, password, phone, experience, referral_code } = payload;

  // ─── Basic server-side validation ─────────────────────────────────────────────────
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Please provide name, email, password, phone, and experience.',
      }),
    };
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please supply a valid email address.' }),
    };
  }

  // Password length
  if (password.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Password must be at least 8 characters long.' }),
    };
  }

  // ─── Check if email already exists in "users" ──────────────────────────────────────
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = “no rows returned” in some Supabase versions, treat that as “no user”
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

  // ─── If a referral_code was provided, verify it exists in affiliate_user ───────────
  if (referral_code) {
    try {
      const { data: affUser, error: checkErr } = await supabase
        .from('affiliate_user')
        .select('id')
        .eq('referral_code', referral_code)
        .single();

      if (checkErr || !affUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid referral code.' }),
        };
      }
    } catch (err) {
      console.error('Error validating referral code:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to validate referral code.' }),
      };
    }
  }

  // ─── Hash the password with SHA-256 → base64 ────────────────────────────────────────
  let password_hash;
  try {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    password_hash = hash.digest('base64');
  } catch (hashErr) {
    console.error('Password hashing error:', hashErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error hashing password.' }),
    };
  }

  // ─── Insert new user into `users` table ────────────────────────────────────────────
  let newUser;
  try {
    const { data, error: insertErr } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password_hash,
          phone,
          experience,
          referral_code: referral_code || null,
          status: 'pending', // you can mark as pending until admin approval
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

  // ─── Send confirmation email via Brevo ────────────────────────────────────────────
  if (!BREVO_API_KEY) {
    console.error('Missing BREVO_API_KEY environment variable');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured.' }),
    };
  }

  const brevoPayload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: email,
        name: name,
      },
    ],
    templateId: BREVO_TEMPLATE_ID,
    params: {
      NAME: name,
      EMAIL: email,
      PHONE: phone,
      EXPERIENCE: experience,
    },
  };

  let brevoResult;
  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    try {
      brevoResult = await brevoResponse.json();
    } catch (jsonErr) {
      console.warn('Could not parse Brevo response JSON:', jsonErr);
    }

    if (!brevoResponse.ok) {
      console.error('Brevo responded with error:', brevoResponse.status, brevoResult);
      const brevoMsg =
        brevoResult?.message || brevoResult?.error || 'Unknown Brevo error';
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

  // ─── Success response ─────────────────────────────────────────────────────────────
  return {
    statusCode: 200,
    body: JSON.stringify({
      message:
        'Application submitted successfully! A confirmation email has been sent.',
    }),
  };
};
