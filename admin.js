// admin.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1) Initialize Supabase client
const SUPABASE_URL     = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) UI elements
const pwModal   = document.getElementById('pwModal');
const loginBtn  = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const menuBtn   = document.getElementById('menuToggle');
const sidebar   = document.getElementById('sidebar');

// 3) Sidebar toggle
menuBtn.addEventListener('click', () => sidebar.classList.toggle('show'));

// 4) Attempt auto-login if session exists
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) initDashboard();
})();

// 5) Login handler with explicit error reporting
loginBtn.addEventListener('click', async () => {
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPw').value;

  if (!email || !password) {
    return alert('Please enter both email and password.');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login error: ' + error.message);
      console.error('Supabase login error', error);
      return;
    }
    // Success
    pwModal.style.display = 'none';
    initDashboard();
  } catch (err) {
    alert('Unexpected error: ' + err.message);
    console.error(err);
  }
});

// 6) Logout handler
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// 7) Initialize dashboard after login
async function initDashboard() {
  showSection('payments');
  document.querySelectorAll('.sidebar a[data-target]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showSection(a.dataset.target);
      sidebar.classList.remove('show');
    });
  });
  // Load data
  await Promise.all([
    loadPayments(),
    loadApplications(),
    loadUsers(),
    loadSettings(),
    loadMessages(),
    loadLogs()
  ]);
}

// 8) Utility to switch sections
function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- Data loaders follow (with basic error alerts) ---

async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return alert('Error loading payments: ' + error.message);
  document.getElementById('paymentTableBody').innerHTML =
    data.map(p => `<tr>
      <td>${p.user_id}</td><td>${p.amount}</td><td>${p.payment_method}</td><td>${p.status}</td>
    </tr>`).join('') ||
    '<tr><td colspan="4">No payments</td></tr>';
}

async function loadApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return alert('Error loading applications: ' + error.message);
  document.getElementById('applicationTableBody').innerHTML =
    data.map(a => `<tr>
      <td>${a.user_id}</td><td>${a.status}</td>
      <td><button class="btn" onclick="updateApplication(${a.id}, 'approved')">Approve</button></td>
      <td><button class="btn" onclick="updateApplication(${a.id}, 'rejected')">Reject</button></td>
    </tr>`).join('') ||
    '<tr><td colspan="4">No applications</td></tr>';
}
window.updateApplication = async (id, status) => {
  const { error } = await supabase.from('applications').update({ status }).eq('id', id);
  if (error) return alert('Error updating application: ' + error.message);
  loadApplications();
};

async function loadUsers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return alert('Error loading users: ' + error.message);
  document.getElementById('userTableBody').innerHTML =
    data.map(u => `<tr>
      <td>${u.user_id}</td><td>${u.status}</td><td>${new Date(u.created_at).toLocaleString()}</td>
    </tr>`).join('') ||
    '<tr><td colspan="3">No users</td></tr>';
}

async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();
  if (error) return alert('Error loading settings: ' + error.message);
  document.getElementById('btcWallet').value = data.btc;
  document.getElementById('ethWallet').value = data.eth;
  document.getElementById('usdtWallet').value = data.usdt;
  document.getElementById('paystackKey').value = data.paystackKey;
}

document.getElementById('submitSettings').addEventListener('click', async () => {
  const btc = document.getElementById('btcWallet').value;
  const eth = document.getElementById('ethWallet').value;
  const usdt = document.getElementById('usdtWallet').value;
  const paystackKey = document.getElementById('paystackKey').value;
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, btc, eth, usdt, paystackKey });
  if (error) return alert('Error saving settings: ' + error.message);
  alert('Settings saved');
});

// Similar pattern for loadMessages, loadLogs, publishSignal, uploadInsight, uploadHistory...
