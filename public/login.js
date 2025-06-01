
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://dapwpgvnfjcfqqhrpxla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ'
);

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const status = document.getElementById('status');

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
  const password_hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  const { data, error } = await supabase
    .from('affiliate_users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password_hash)
    .single();

  if (error || !data) {
    status.textContent = "Login failed. Check your credentials.";
    setTimeout(() => window.location.href = "/affiliate-signup.html", 2000);
  } else {
    localStorage.setItem('affiliate_user', JSON.stringify(data));
    window.location.href = "/affiliate-dashboard.html";
  }
});
