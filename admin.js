// Initialize Supabase
const supabaseUrl = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Sidebar toggle (optional)
document.getElementById('menuToggle').onclick = () => {
  document.getElementById('sidebar').classList.toggle('show');
};

// Navigation
document.querySelectorAll('.sidebar a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.dataset.target;
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});
// Show default
document.getElementById('signals').classList.add('active');

// —— Signals —— 
document.getElementById('submitSignal').onclick = async () => {
  const obj = {
    currency_pair: document.getElementById('pair').value,
    entry_point: parseFloat(document.getElementById('entry').value),
    stop_loss: parseFloat(document.getElementById('sl').value),
    take_profit: parseFloat(document.getElementById('tp').value),
    note: document.getElementById('signalNote').value,
    status: 'pending'
  };
  const { error } = await supabase.from('signals').insert([obj]);
  if (error) return alert('Error: ' + error.message);
  loadSignals();
};
async function loadSignals() {
  const { data } = await supabase.from('signals').select('*').order('created_at', { ascending: false });
  const ul = document.getElementById('signalList');
  ul.innerHTML = data.map(s => `<li>${s.currency_pair} | EP:${s.entry_point} SL:${s.stop_loss} TP:${s.take_profit} — ${s.note}</li>`).join('');
}
loadSignals();

// —— Testimonials —— 
async function loadTestimonials() {
  const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
  document.getElementById('testimonialList').innerHTML = data.map(t => `
    <li>
      ${t.content} — <em>${t.status}</em>
      <button onclick="updateTestimonial(${t.id}, 'approved')">Approve</button>
      <button onclick="updateTestimonial(${t.id}, 'rejected')">Reject</button>
    </li>
  `).join('');
}
window.updateTestimonial = async (id, status) => {
  await supabase.from('testimonials').update({ status }).eq('id', id);
  loadTestimonials();
};
loadTestimonials();

// —— Payments —— 
async function loadPayments() {
  const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  document.getElementById('paymentList').innerHTML = data.map(p => `
    <li>User:${p.user_id} Amount:${p.amount} ${p.payment_method} — ${p.status}</li>
  `).join('');
}
loadPayments();

// —— Inbox —— 
async function loadInbox() {
  const { data } = await supabase.from('inbox').select('*').order('created_at', { ascending: false });
  document.getElementById('inboxList').innerHTML = data.map(m => `
    <li>
      ${m.user_email}: ${m.message}
      <button onclick="replyInbox(${m.id})">Reply</button>
    </li>
  `).join('');
}
window.replyInbox = async id => {
  const resp = prompt('Your reply:');
  if (!resp) return;
  await supabase.from('inbox').update({ response: resp }).eq('id', id);
  loadInbox();
};
loadInbox();

// —— Trade Insights —— 
document.getElementById('submitInsight').onclick = async () => {
  const file = document.getElementById('insightFile').files[0];
  const note = document.getElementById('insightNote').value;
  const path = `trade_insights/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trade_insights').insert([{ screenshot_url: path, insight_content: note }]);
  loadInsights();
};
async function loadInsights() {
  const { data } = await supabase.from('trade_insights').select('*').order('created_at', { ascending: false });
  document.getElementById('insightList').innerHTML = data.map(i => `<li>${i.insight_content} — <a href="${supabase.storage.from('files').getPublicUrl(i.screenshot_url).publicURL}" target="_blank">View</a></li>`).join('');
}
loadInsights();

// —— Trading History —— 
document.getElementById('submitHistory').onclick = async () => {
  const file = document.getElementById('historyFile').files[0];
  const note = document.getElementById('historyNote').value;
  const month = document.getElementById('tradeMonth').value;
  const path = `trading_history/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trading_history').insert([{ screenshot_url: path, month, year: new Date().getFullYear() }]);
  loadHistory();
};
async function loadHistory() {
  const { data } = await supabase.from('trading_history').select('*').order('created_at', { ascending: false });
  document.getElementById('historyList').innerHTML = data.map(h => `<li>${h.month} ${h.year} — <a href="${supabase.storage.from('files').getPublicUrl(h.screenshot_url).publicURL}" target="_blank">View</a></li>`).join('');
}
loadHistory();

// —— Members —— 
async function loadMembers() {
  const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  document.getElementById('memberList').innerHTML = data.map(m => `
    <li>
      User:${m.user_id} — ${m.status}
      <button onclick="updateMember(${m.id}, 'approved')">Approve</button>
      <button onclick="updateMember(${m.id}, 'rejected')">Reject</button>
    </li>
  `).join('');
}
window.updateMember = async (id, status) => {
  await supabase.from('members').update({ status }).eq('id', id);
  loadMembers();
};
loadMembers();
