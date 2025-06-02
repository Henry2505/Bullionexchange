// ─────────────── admin-auth.js ───────────────

// 1) Supabase client is already in admin-main.js; just import that file before this one.

// 2) loginUser(): called when “Login” button is clicked
async function loginUser() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const messageEl = document.getElementById('login-message');

  messageEl.textContent = 'Signing in…';
  try {
    // 2a) Sign in via Supabase Auth
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email, 
      password
    });

    if (error) throw error;

    // 2b) Retrieve user's current_session_token column (from users table)
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, user_name, current_session_token')
      .eq('id', user.user.id)
      .single();

    if (fetchError) throw fetchError;

    // 2c) Compare tokens (optional if you store new sessionToken on login)
    const newToken = data.current_session_token;
    localStorage.setItem('sessionToken', newToken);
    sessionStorage.setItem('userId', data.id);
    sessionStorage.setItem('userName', data.user_name);

    // 2d) Log “login” activity
    await logActivity('login');

    // 2e) Redirect to admin-dashboard.html
    window.location.href = 'admin-dashboard.html';

  } catch (err) {
    console.error('Login error:', err.message);
    messageEl.textContent = 'Invalid credentials or network error';
    messageEl.style.color = 'var(--error)';
  }
}

// 3) Attach to “Login” button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', async e => {
    e.preventDefault();
    await loginUser();
  });
});
