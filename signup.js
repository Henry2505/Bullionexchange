
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://dapwpgvnfjcfqqhrpxla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ'
);

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const referred_by = document.getElementById('referred_by').value.trim();
  const status = document.getElementById('status');

  if (!name || !email || !password) {
    status.textContent = "Please fill in all fields.";
    return;
  }

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
  const password_hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  const referral_code = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { error } = await supabase.from('affiliate_users').insert([{
    name, email, password_hash, referred_by, referral_code
  }]);

  if (error) {
    status.textContent = "Signup failed: " + error.message;
  } else {
    window.location.href = "/affiliate-login.html";
  }
});
