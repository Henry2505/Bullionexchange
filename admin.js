// Initialize Supabase client
const SUPABASE_URL     = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Toggle sidebar
document.getElementById('menuToggle').onclick = () =>
  document.getElementById('sidebar').classList.toggle('show');

// Login flow
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPw').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login failed: ' + error.message);
  document.getElementById('pwModal').style.display = 'none';
  initDashboard();
};

// Logout
document.getElementById('logoutBtn').onclick = () => {
  supabase.auth.signOut();
  location.reload();
};

// After successful login
async function initDashboard() {
  showSection('payments');
  // set up nav links
  document.querySelectorAll('.sidebar a[data-target]').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      showSection(a.dataset.target);
      document.getElementById('sidebar').classList.remove('show');
    };
  });
  // load all data
  await Promise.all([
    loadPayments(),
    loadApplications(),
    loadUsers(),
    loadSettings(),
    loadMessages(),
    loadLogs()
  ]);
}

// Utility to show one section
function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Load payments
async function loadPayments() {
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('paymentTableBody');
  tbody.innerHTML = data.map(p => `<tr>
    <td>${p.user_id}</td><td>${p.amount}</td><td>${p.payment_method}</td><td>${p.status}</td>
  </tr>`).join('') || '<tr><td colspan="4">No payments</td></tr>';
}

// Load applications
async function loadApplications() {
  const { data, error } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('applicationTableBody');
  tbody.innerHTML = data.map(a => `<tr>
    <td>${a.user_id}</td><td>${a.status}</td>
    <td><button class="btn" onclick="updateApplication(${a.id}, 'approved')">Approve</button></td>
    <td><button class="btn" onclick="updateApplication(${a.id}, 'rejected')">Reject</button></td>
  </tr>`).join('') || '<tr><td colspan="4">No applications</td></tr>';
}
async function updateApplication(id, status) {
  await supabase.from('applications').update({ status }).eq('id', id);
  loadApplications();
}

// Load users
async function loadUsers() {
  const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = data.map(u => `<tr>
    <td>${u.user_id}</td><td>${u.status}</td><td>${new Date(u.created_at).toLocaleString()}</td>
  </tr>`).join('') || '<tr><td colspan="3">No users</td></tr>';
}

// Load settings
async function loadSettings() {
  const { data } = await supabase.from('settings').select('*').limit(1).single();
  if (data) {
    document.getElementById('btcWallet').value = data.btc;
    document.getElementById('ethWallet').value = data.eth;
    document.getElementById('usdtWallet').value = data.usdt;
    document.getElementById('paystackKey').value = data.paystackKey;
  }
}
document.getElementById('submitSettings').onclick = async () => {
  const btc = document.getElementById('btcWallet').value;
  const eth = document.getElementById('ethWallet').value;
  const usdt = document.getElementById('usdtWallet').value;
  const paystackKey = document.getElementById('paystackKey').value;
  await supabase.from('settings').upsert({ id: 1, btc, eth, usdt, paystackKey });
  alert('Settings saved');
};

// Load inbox messages
async function loadMessages() {
  const { data } = await supabase.from('inbox').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('messageTableBody');
  tbody.innerHTML = data.map(m => `<tr>
    <td>${m.user_email}</td><td>${m.message}</td><td>${m.response || ''}</td>
    <td><button class="btn" onclick="replyMessage(${m.id})">Reply</button></td>
  </tr>`).join('') || '<tr><td colspan="4">No messages</td></tr>';
}
window.replyMessage = async id => {
  const resp = prompt('Enter your reply:');
  if (!resp) return;
  await supabase.from('inbox').update({ response: resp }).eq('id', id);
  loadMessages();
};

// Load logs
async function loadLogs() {
  const { data } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
  document.getElementById('logList').innerHTML = data.map(l => `<li>[${l.timestamp}] ${l.message}</li>`).join('') || '<li>No logs</li>';
}
document.getElementById('clearLogs').onclick = async () => {
  await supabase.from('logs').delete().neq('id', 0);
  loadLogs();
};

// Publish signal
document.getElementById('submitSignal').onclick = async () => {
  const obj = {
    currency_pair: document.getElementById('pair').value,
    type: document.getElementById('type').value,
    entry_point: parseFloat(document.getElementById('entry').value),
    take_profit: parseFloat(document.getElementById('tp').value),
    stop_loss: parseFloat(document.getElementById('sl').value),
    note: document.getElementById('signalNote').value,
    status: 'pending'
  };
  await supabase.from('signals').insert([obj]);
  alert('Signal published');
};

// Broadcast (simple alert)
document.getElementById('sendBroadcast').onclick = () => {
  const txt = document.getElementById('broadcastText').value;
  alert('Broadcast sent: ' + txt);
};

// Upload trade insight
document.getElementById('submitInsight').onclick = async () => {
  const file = document.getElementById('insightFile').files[0];
  const note = document.getElementById('insightNote').value;
  const path = `trade_insights/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trade_insights').insert([{ screenshot_url: path, insight_content: note }]);
  alert('Insight uploaded');
};

// Upload trading history
document.getElementById('submitHistory').onclick = async () => {
  const file = document.getElementById('historyFile').files[0];
  const note = document.getElementById('historyNote').value;
  const month = document.getElementById('tradeMonth').value;
  const path = `trading_history/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trading_history').insert([{ screenshot_url: path, month, year: new Date().getFullYear() }]);
  alert('History uploaded');
};
