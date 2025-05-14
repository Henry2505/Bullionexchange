import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getPlan() {
  return new URLSearchParams(window.location.search).get('plan') || '';
}
function formatAmount(plan) {
  return plan === 'weekly'  ? 50
       : plan === 'monthly' ? 150
       : plan === 'yearly'  ? 1500
       : 0;
}

document.addEventListener('DOMContentLoaded', async () => {
  const plan = getPlan();
  const amount = formatAmount(plan);

  document.getElementById('planInfo').textContent = plan
    ? `You selected: ${plan.toUpperCase()} plan ($${amount}${plan==='weekly'?'/week':plan==='monthly'?'/month':'/year'})`
    : 'No plan selected.';

  // Load payment_settings
  const { data: settings } = await supabase.from('payment_settings').select('key,value');
  const lookup = {};
  settings.forEach(s => lookup[s.key] = s.value);

  // Paystack button
  document.getElementById('paystackBtn').onclick = () => {
    if (!lookup.Paystack) return alert('Paystack not configured yet.');
    window.open(lookup.Paystack, '_blank');
  };

  // Crypto button
  document.getElementById('cryptoBtn').onclick = () => {
    document.getElementById('cryptoOptions').style.display = 'block';
  };

  // Crypto selection
  document.getElementById('cryptoType').onchange = function() {
    document.getElementById('walletAddress').textContent =
      lookup[this.value] || 'Not available';
  };

  // Copy wallet
  document.getElementById('copyWalletBtn').onclick = () => {
    const addr = document.getElementById('walletAddress').textContent;
    if (addr && addr !== 'Not available') {
      navigator.clipboard.writeText(addr).then(() => alert('Copied!'));
    }
  };

  // Form submit
  document.getElementById('paymentForm').onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const isCrypto = document.getElementById('cryptoOptions').style.display === 'block';
    const method = isCrypto
      ? document.getElementById('cryptoType').value
      : 'Paystack';

    if (!plan || amount === 0) return alert('Invalid plan.');
    if (!email) return alert('Enter your email.');
    if (isCrypto && !method) return alert('Select crypto.');

    // Prevent duplicates
    const { data: dup } = await supabase
      .from('user_payments')
      .select('id')
      .eq('user_email', email)
      .eq('plan', plan)
      .in('status', ['pending','approved']);
    if (dup.length) return alert('You already submitted for this plan.');

    // Insert
    const { error } = await supabase.from('user_payments').insert({
      user_email: email,
      amount,
      method,
      details: isCrypto ? lookup[method] : '',
      plan
    });
    if (error) {
      console.error(error);
      alert('Submission failed.');
    } else {
      alert('Payment submitted! Await approval.');
      window.location.href = 'CBE_login.html';
    }
  };
});
