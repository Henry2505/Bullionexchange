import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase URL & anon key
const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('login-form');
const statusEl = document.getElementById('status');
const loginBtn = document.getElementById('login-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    statusEl.textContent = 'Please enter both email and password.';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    return;
  }

  // Hash the password using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const password_hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  const { data, error } = await supabase
    .from('affiliate_user')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password_hash)
    .single();

  if (error || !data) {
    statusEl.textContent = 'Login failed: Check your credentials.';
    setTimeout(() => {
      window.location.href = 'affiliate-signup.html';
    }, 2000);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  } else {
    // Save to localStorage for dashboard use
    localStorage.setItem('affiliate_user', JSON.stringify(data));
    window.location.href = 'affiliate-dashboard.html';
  }
});
