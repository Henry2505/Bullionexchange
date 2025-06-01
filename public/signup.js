import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase URL & anon key
const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('signup-form');
const statusEl = document.getElementById('status');
const signupBtn = document.getElementById('signup-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  signupBtn.disabled = true;
  signupBtn.textContent = 'Signing up...';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const referred_by = document.getElementById('referred_by').value.trim() || null;

  if (!name || !email || !password) {
    statusEl.textContent = 'Please fill in all required fields.';
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
    return;
  }

  // Hash password with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const password_hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Insert into affiliate_user
  const { error } = await supabase
    .from('affiliate_user')
    .insert([{ name, email, password_hash, referred_by }]);

  if (error) {
    statusEl.textContent = 'Signup failed: ' + error.message;
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
  } else {
    window.location.href = 'affiliate-login.html';
  }
});
