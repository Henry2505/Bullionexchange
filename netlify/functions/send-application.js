// netlify/functions/send-application.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with Service Role key (set in Netlify’s ENV)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  const { name, email, password, phone, experience, referral_code } = payload;

  // Basic validation
  if (!name || !email || !password || !phone || !experience) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Please provide name, email, password, phone, and experience.'
      })
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please provide a valid email address.' })
    };
  }

  // Validate password length
  if (password.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Password must be at least 8 characters long.' })
    };
  }

  // If a referral_code was provided, verify it exists in affiliate_user
  if (referral_code) {
    const { data: affUser, error: checkErr } = await supabase
      .from('affiliate_user')
      .select('id')
      .eq('referral_code', referral_code)
      .single();

    if (checkErr || !affUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid referral code.' })
      };
    }
  }

  // Hash the password with SHA-256 → base64
  let password_hash;
  try {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    password_hash = hash.digest('base64');
  } catch (hashErr) {
    console.error('Password hashing error:', hashErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error hashing password.' })
    };
  }

  // Insert into `users` table
  const { data, error: insertErr } = await supabase
    .from('users')
    .insert([
      {
        name,
        email,
        password_hash,
        phone,
        experience,
        referral_code: referral_code || null
      }
    ]);

  if (insertErr) {
    console.error('Supabase insert error:', insertErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: insertErr.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Application submitted successfully.' })
  };
};
