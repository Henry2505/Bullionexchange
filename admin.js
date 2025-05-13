// admin.js

// 1) Initialize Supabase client
const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) When DOM is ready, wire up navigation and load default data
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar toggle (for mobile)
  document.getElementById('menuToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('show');
  };

  // SPA-style navigation
  document.querySelectorAll('.sidebar a[data-target]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.target;
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Show first tab by default
  const firstLink = document.querySelector('.sidebar a[data-target]');
  if (firstLink) firstLink.click();

  // Load all data sections
  loadSignals();
  loadTestimonials();
  loadPayments();
  loadInbox();
  loadInsights();
  loadHistory();
  loadMembers();
});

// —— Signals —— 
document.getElementById('submitSignal').onclick = async () => {
  const obj = {
    currency_pair: document.getElementById('pair').value,
    entry_point:   parseFloat(document.getElementById('entry').value),
    stop_loss:     parseFloat(document.getElementById('sl').value),
    take_profit:   parseFloat(document.getElementById('tp').value),
    note:          document.getElementById('signalNote').value,
    status:        'pending'
  };
  const { error } = await supabase.from('signals').insert([obj]);
  if (error) return alert('Error posting signal: ' + error.message);
  loadSignals();
};
async function loadSignals() {
  const { data, error } = await supabase.from('signals')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading signals:', error);
  document.getElementById('signalList').innerHTML = data
    .map(s => `<li>${s.currency_pair} | EP:${s.entry_point} SL:${s.stop_loss} TP:${s.take_profit} — ${s.note}</li>`)
    .join('');
}

// —— Testimonials —— 
async function loadTestimonials() {
  const { data, error } = await supabase.from('testimonials')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading testimonials:', error);
  document.getElementById('testimonialList').innerHTML = data
    .map(t => `
      <li>
        ${t.content} — <em>${t.status}</em>
        <button onclick="updateTestimonial(${t.id}, 'approved')">Approve</button>
        <button onclick="updateTestimonial(${t.id}, 'rejected')">Reject</button>
      </li>
    `).join('');
}
window.updateTestimonial = async (id, status) => {
  const { error } = await supabase.from('testimonials')
    .update({ status }).eq('id', id);
  if (error) return alert('Error updating testimonial: ' + error.message);
  loadTestimonials();
};

// —— Payments —— 
async function loadPayments() {
  const { data, error } = await supabase.from('payments')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading payments:', error);
  document.getElementById('paymentList').innerHTML = data
    .map(p => `<li>User:${p.user_id} Amount:${p.amount} ${p.payment_method} — ${p.status}</li>`)
    .join('');
}

// —— Inbox —— 
async function loadInbox() {
  const { data, error } = await supabase.from('inbox')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading inbox:', error);
  document.getElementById('inboxList').innerHTML = data
    .map(m => `
      <li>
        <strong>${m.user_email}:</strong> ${m.message}
        <button onclick="replyInbox(${m.id})">Reply</button>
      </li>
    `).join('');
}
window.replyInbox = async id => {
  const resp = prompt('Enter your reply:');
  if (!resp) return;
  const { error } = await supabase.from('inbox')
    .update({ response: resp }).eq('id', id);
  if (error) return alert('Error replying: ' + error.message);
  loadInbox();
};

// —— Trade Insights —— 
document.getElementById('submitInsight').onclick = async () => {
  const file = document.getElementById('insightFile').files[0];
  const note = document.getElementById('insightNote').value;
  const path = `trade_insights/${Date.now()}-${file.name}`;
  let { error: uploadError } = await supabase.storage.from('files').upload(path, file);
  if (uploadError) return alert('File upload failed: ' + uploadError.message);
  const { error } = await supabase.from('trade_insights')
    .insert([{ screenshot_url: path, insight_content: note }]);
  if (error) return alert('Error saving insight: ' + error.message);
  loadInsights();
};
async function loadInsights() {
  const { data, error } = await supabase.from('trade_insights')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading insights:', error);
  document.getElementById('insightList').innerHTML = data
    .map(i => `<li>${i.insight_content} — <a href="${supabase.storage.from('files').getPublicUrl(i.screenshot_url).publicURL}" target="_blank">View</a></li>`)
    .join('');
}

// —— Trading History —— 
document.getElementById('submitHistory').onclick = async () => {
  const file = document.getElementById('historyFile').files[0];
  const note = document.getElementById('historyNote').value;
  const month = document.getElementById('tradeMonth').value;
  const path = `trading_history/${Date.now()}-${file.name}`;
  let { error: uploadError } = await supabase.storage.from('files').upload(path, file);
  if (uploadError) return alert('File upload failed: ' + uploadError.message);
  const { error } = await supabase.from('trading_history')
    .insert([{ screenshot_url: path, month, year: new Date().getFullYear() }]);
  if (error) return alert('Error saving history: ' + error.message);
  loadHistory();
};
async function loadHistory() {
  const { data, error } = await supabase.from('trading_history')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading history:', error);
  document.getElementById('historyList').innerHTML = data
    .map(h => `<li>${h.month} ${h.year} — <a href="${supabase.storage.from('files').getPublicUrl(h.screenshot_url).publicURL}" target="_blank">View</a></li>`)
    .join('');
}

// —— Members —— 
async function loadMembers() {
  const { data, error } = await supabase.from('members')
    .select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading members:', error);
  document.getElementById('memberList').innerHTML = data
    .map(m => `
      <li>
        User:${m.user_id} — ${m.status}
        <button onclick="updateMember(${m.id}, 'approved')">Approve</button>
        <button onclick="updateMember(${m.id}, 'rejected')">Reject</button>
      </li>
    `).join('');
}
window.updateMember = async (id, status) => {
  const { error } = await supabase.from('members').update({ status }).eq('id', id);
  if (error) return alert('Error updating member: ' + error.message);
  loadMembers();
};
loadMembers();
