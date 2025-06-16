// netlify/functions/send-application.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BREVO_API_KEY        = process.env.BREVO_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}
if (!BREVO_API_KEY) {
  console.error('❌ Missing BREVO_API_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: JSON.stringify({ error: 'Use POST' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, email, password, phone, experience, referral_code } = payload;

  // 1) Basic validation
  if (![name, email, password, phone, experience].every(v => v && v.toString().trim())) {
    return { statusCode: 400, body: JSON.stringify({ error: 'All fields are required.' }) };
  }

  // 2) Check duplicate email
  const { data: existingUser, error: emailErr } = await supabase
    .from('users')
    .select('id', { head: true })
    .eq('email', email.toLowerCase());
  if (emailErr && emailErr.code !== 'PGRST116') {
    console.error('Error checking existing user:', emailErr);
    return { statusCode: 500, body: JSON.stringify({ error: 'Email check failed.' }) };
  }
  if (existingUser > 0) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Email already registered.' }) };
  }

  // 3) Referral lookup (if provided)
  let referredByUserId = null;
  if (referral_code) {
    const code = referral_code.trim().toUpperCase();
    console.log('🔍 [send-application] Received referral_code:', referral_code, '→ Normalized to:', code);

    const { data: affRow, error: affErr } = await supabase
      .from('affiliate_accounts')
      .select('user_id')
      // case-insensitive match in case there’s any stray casing
      .ilike('referral_code', code)
      .single();

    console.log('↩️ [send-application] affiliate_accounts lookup:', { affRow, affErr });

    if (affErr || !affRow) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid referral code.' }) };
    }

    // affRow.user_id must point at an existing users.id
    referredByUserId = affRow.user_id;
  }

  // 4) Hash password (optional)
  const pwToStore = password; // or hash if you uncomment below

  // 5) Insert new user
  const { data: newUser, error: insertErr } = await supabase
    .from('users')
    .insert([{
      name,
      email: email.toLowerCase(),
      password: pwToStore,
      phone,
      experience,
      referred_by: referredByUserId,
      status: 'pending',
    }])
    .select('id')
    .single();

  if (insertErr) {
    console.error('❌ Insert user error:', insertErr);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit application.' }) };
  }

  // 6) Send confirmation email via Brevo
  const brevoPayload = {
    sender: { name: 'CBE', email: 'noreply@apexincomeoptions.com.ng' },
    to: [{ email: newUser.email, name }],
    templateId: 1,
    params: { NAME: name }
  };

  const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(brevoPayload)
  });

  if (!brevoResp.ok) {
    const errJson = await brevoResp.json().catch(() => ({}));
    console.error('❌ Brevo error:', brevoResp.status, errJson);
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to send confirmation email.' }) };
  }

  // 7) Success
  return { statusCode: 200, body: JSON.stringify({ message: 'Application submitted!' }) };
};
