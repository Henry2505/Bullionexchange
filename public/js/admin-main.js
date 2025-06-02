// ─────────────── admin-main.js ───────────────

// 1) Supabase Initialization (shared by all admin scripts)
const SUPA_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzYWMiLCJyZWYiOiIkQGRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// 2) API Keys (shared if needed)
const EXCHANGE_RATE_API_KEY = '4e4307b2bf8daac15365a410';
const GNEWS_API_KEY         = '03a6fdcc98666513a11a078b2e21b3d7';
const FINNHUB_API_KEY       = 'd0um351r01qn5fk68hc0d0um351r01qn5fk68hcg';

// 3) retryFetch: generic wrapper to retry failed fetch calls
async function retryFetch(url, options = {}, retries = 1, delay = 2000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// 4) getUserInfo: simple client‐side IP + userAgent (Supabase logs "city" & "country" as "Unknown")
async function getUserInfo() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    return { ip, city: 'Unknown', country: 'Unknown', device: navigator.userAgent };
  } catch {
    return { ip: 'Unknown', city: 'Unknown', country: 'Unknown', device: navigator.userAgent };
  }
}

// 5) logActivity: inserts a row into user_activity table
async function logActivity(action) {
  const userInfo = await getUserInfo();
  const userId   = sessionStorage.getItem('userId') || 'anonymous';
  try {
    const { error } = await supabase.from('user_activity').insert({
      user_id:    userId,
      action,
      ip_address: userInfo.ip,
      city:       userInfo.city,
      country:    userInfo.country,
      device:     userInfo.device
    });
    if (error) throw error;
    addNotification(`User ${action} from ${userInfo.city}`, 'info');
  } catch (err) {
    console.error('Log activity error:', err.message);
    addNotification('Failed to log activity', 'critical');
  }
}

// 6) downloadActivityLog: export entire user_activity table to CSV
async function downloadActivityLog() {
  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;

    // Build CSV
    const header = 'Timestamp,Action,IP Address,City,Country,Device';
    const rows = data.map(row => {
      const t = new Date(row.timestamp).toLocaleString();
      return `${t},${row.action},${row.ip_address},${row.city},${row.country},"${row.device}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'activity_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Logs exported successfully', 'info');
  } catch (err) {
    console.error('Export logs error:', err.message);
    addNotification('Failed to export logs', 'critical');
  }
}

// 7) convertCurrency: example utility (used if a page includes a converter)
async function convertCurrency() {
  const from     = document.getElementById('converter-from').value;
  const to       = document.getElementById('converter-to').value;
  const amount   = parseFloat(document.getElementById('converter-amount').value) || 1;
  const resultEl = document.getElementById('converter-result');
  resultEl.innerHTML = '<div class="spinner"></div>';
  const cacheKey = `${from}_${to}`;

  // client‐side cache
  if (window.apiCache && window.apiCache.has(cacheKey)) {
    const rate = window.apiCache.get(cacheKey);
    resultEl.textContent = `${amount} ${from} = ${(amount * rate).toFixed(2)} ${to}`;
    return;
  }

  try {
    const res  = await retryFetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${from}`);
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    const rate = data.conversion_rates[to];
    window.apiCache = window.apiCache || new Map();
    window.apiCache.set(cacheKey, rate);
    setTimeout(() => window.apiCache.delete(cacheKey), 5 * 60 * 1000);
    resultEl.textContent = `${amount} ${from} = ${(amount * rate).toFixed(2)} ${to}`;
  } catch (err) {
    console.error('Convert currency error:', err.message);
    resultEl.innerHTML = '<span style="color:var(--error)">Failed to convert currency</span>';
    addNotification('Currency conversion failed', 'critical');
  }
}

// 8) checkSession & logout: ensure only valid sessionToken can stay logged in
async function checkSession() {
  const localToken = localStorage.getItem('sessionToken');
  if (!localToken) {
    logout();
    return;
  }
  const userId = sessionStorage.getItem('userId');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('current_session_token')
      .eq('id', userId)
      .single();
    if (error) throw error;
    if (data.current_session_token !== localToken) {
      logout();
    }
  } catch (err) {
    console.error('Check session error:', err.message);
    addNotification('Session validation failed', 'critical');
  }
}

async function logout() {
  try {
    await logActivity('logout');
    localStorage.removeItem('sessionToken');
    sessionStorage.clear();
    window.location.href = 'admin-login.html?message=logged_out';
  } catch (err) {
    console.error('Logout error:', err.message);
  }
}

// 9) toggleTheme: dark / light
function toggleTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-select').value = theme;
}

// 10) addNotification: show in notification dropdown + play sound
function addNotification(message, type = 'info') {
  const list  = document.getElementById('notif-list');
  const count = document.getElementById('notif-count');
  const li    = document.createElement('li');
  li.textContent = message;
  li.classList.add(type);
  li.style.cursor = 'pointer';
  li.onclick = () => {
    li.style.opacity = '0';
    setTimeout(() => li.remove(), 300);
  };
  list.insertBefore(li, list.firstChild);
  count.textContent = parseInt(count.textContent || '0') + 1;
  const sound = document.querySelector(type === 'critical' ? '#critical-notif-sound' : '#notif-sound');
  if (sound) sound.play().catch(err => console.error('Audio error:', err.message));
}

// 11) DOMContentLoaded in main: set up sidebar toggle, notifications, theme, logout, and re-validate session periodically
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();

  // Realtime session check (Supabase Realtime subscription)
  const userId = sessionStorage.getItem('userId');
  if (userId) {
    supabase
      .channel(`users:id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        payload => {
          const localToken = localStorage.getItem('sessionToken');
          if (payload.new.current_session_token !== localToken) {
            logout();
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') console.log('Realtime user subscription active');
      });
  }

  setInterval(checkSession, 15000); // re-check every 15s

  document.getElementById('theme-select')?.addEventListener('change', e => toggleTheme(e.target.value));
  document.getElementById('notif-btn')?.addEventListener('click', () => {
    new bootstrap.Dropdown(document.getElementById('notif-btn')).toggle();
  });
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    new bootstrap.Offcanvas(document.getElementById('sidebar')).toggle();
  });
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('export-logs')?.addEventListener('click', downloadActivityLog);
  document.getElementById('convert-btn')?.addEventListener('click', convertCurrency);
});
