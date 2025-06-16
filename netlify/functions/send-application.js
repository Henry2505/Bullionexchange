// netlify/functions/send-application.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BREVO_API_KEY        = process.env.BREVO_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: JSON.stringify({ error: 'Use POST' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    console.error('⛔ Invalid JSON:', err);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
  }
  const { name, email, password, phone, experience, referral_code } = payload;

  // (steps 1 & 2 omitted for brevity…)

  // ─── 3) Referral lookup ─────────────────────────────────────────
  let referredByAffiliateId = null;
  if (referral_code) {
    const code = referral_code.trim().toUpperCase();
    console.log('🔍 validating referral_code:', code);

    const { data: affRow, error: affErr } = await supabase
      .from('affiliate_accounts')
      .select('id')
      .eq('referral_code', code)
      .single();

    console.log('↩️ affiliate_accounts lookup:', { affRow, affErr });
    if (affErr || !affRow) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid referral code.' }) };
    }
    referredByAffiliateId = affRow.id;
  }

  // ─── 4) (Hash pw omitted) ────────────────────────────────────────
  const pwToStore = password;

  // ─── 5) Insert new user ─────────────────────────────────────────
  console.log('💾 Inserting new user…');
  const { data: newUser, error: insertErr } = await supabase
    .from('users')
    .insert([{
      name, email, password: pwToStore, phone, experience,
      referred_by: referredByAffiliateId,
      status: 'pending',
    }])
    .single();

  if (insertErr) {
    console.error('⛔ User insert error:', insertErr);
    return { statusCode: 500, body: JSON.stringify({ error: insertErr.message }) };
  }
  console.log('✅ New user created:', newUser);

  // ─── 6a) Record the referral ─────────────────────────────────────
  if (referredByAffiliateId) {
    console.log('💾 Recording referral…');
    const { data: refData, error: refErr } = await supabase
      .from('referrals')
      .insert([{
        affiliate_id: referredByAffiliateId,
        referred_user_id: newUser.id,
        created_at: new Date().toISOString(),
      }])
      .single();
    if (refErr) {
      console.error('⛔ Referral insert error:', refErr);
      // Don’t bail; just log
    } else {
      console.log('✅ Referral recorded:', refData);
    }
  }

  // ─── 6b) Send confirmation email ─────────────────────────────────
  console.log('📧 Sending confirmation email…');
  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'CBE', email: 'noreply@apexincomeoptions.com.ng' },
        to: [{ email, name }],
        templateId: 1,
        params: { NAME: name, EMAIL: email }
      })
    });
    const brevoJson = await brevoResponse.json().catch(() => ({}));
    if (!brevoResponse.ok) {
      console.error('⛔ Brevo error:', brevoResponse.status, brevoJson);
      return { statusCode: 502, body: JSON.stringify({ error: brevoJson }) };
    }
    console.log('✅ Brevo response:', brevoJson);
  } catch (err) {
    console.error('⛔ Error sending email:', err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }

  // ─── 7) Success ───────────────────────────────────────────────────
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Application submitted successfully!' })
  };
};
