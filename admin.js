// admin.js

// 1) Initialize Supabase client
const SUPABASE_URL     = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) Wire up UI elements
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');
const menuToggleBtn = document.getElementById('menuToggle');
const sidebar       = document.getElementById('sidebar');
const pwModal       = document.getElementById('pwModal');

// 3) Toggle sidebar
menuToggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('show');
});

// 4) Handle login
loginBtn.addEventListener('click', async () => {
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPw').value;

  if (!email || !password) {
    return alert('Please enter both email and password.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return alert('Login failed: ' + error.message);
  }

  // On successful login, hide modal and init dashboard
  pwModal.style.display = 'none';
  initDashboard();
});

// 5) Handle logout
logoutBtn.addEventListener('click', () => {
  supabase.auth.signOut();
  window.location.reload();
});

// 6) If already logged in (page refresh), skip login modal
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    pwModal.style.display = 'none';
    initDashboard();
  }
});

// 7) Main dashboard init
async function initDashboard() {
  // Show default section
  showSection('payments');

  // Nav links
  document.querySelectorAll('.sidebar a[data-target]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showSection(a.dataset.target);
      sidebar.classList.remove('show');
    });
  });

  // Load all data in parallel
  await Promise.all([
    loadPayments(),
    loadApplications(),
    loadUsers(),
    loadSettings(),
    loadMessages(),
    loadLogs()
  ]);
}

// 8) Utility to switch visible section
function showSection(id) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// 9) Data-loaders (examples shown for payments & applications; replicate for others)
async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error('Payment load error:', error);
  document.getElementById('paymentTableBody').innerHTML = data.map(p => `
    <tr>
      <td>${p.user_id}</td>
      <td>${p.amount}</td>
      <td>${p.payment_method}</td>
      <td>${p.status}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No payments</td></tr>';
}

async function loadApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error('Applications load error:', error);
  document.getElementById('applicationTableBody').innerHTML = data.map(a => `
    <tr>
      <td>${a.user_id}</td>
      <td>${a.status}</td>
      <td><button class="btn" onclick="updateApplication(${a.id}, 'approved')">Approve</button></td>
      <td><button class="btn" onclick="updateApplication(${a.id}, 'rejected')">Reject</button></td>
    </tr>
  `).join('') || '<tr><td colspan="4">No applications</td></tr>';
}

window.updateApplication = async (id, status) => {
  await supabase.from('applications').update({ status }).eq('id', id);
  loadApplications();
};

// ...and so on for loadUsers(), loadSettings(), loadMessages(), loadLogs(),
// plus your publishSignal(), uploadInsight(), uploadHistory(), etc., exactly as before.

// Just be sure each function is called inside initDashboard()
