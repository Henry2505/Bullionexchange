import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Your actual Supabase project credentials
const supabaseUrl = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Handle form submission
document.getElementById('signalForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const currency_pair = document.getElementById('currencyPair').value;
  const entry_point = parseFloat(document.getElementById('entryPoint').value);
  const stop_loss = parseFloat(document.getElementById('stopLoss').value);
  const take_profit = parseFloat(document.getElementById('takeProfit').value);
  const note = document.getElementById('note').value;

  const { data, error } = await supabase
    .from('signals')
    .insert([{ currency_pair, entry_point, stop_loss, take_profit, note }]);

  if (error) {
    alert('Error posting signal: ' + error.message);
  } else {
    alert('Signal posted successfully!');
    document.getElementById('signalForm').reset();
    loadSignals();
  }
});

// Load all signals
async function loadSignals() {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false });

  const list = document.getElementById('signalItems');
  list.innerHTML = '';

  if (data && data.length > 0) {
    data.forEach(signal => {
      const item = document.createElement('li');
      item.textContent = `${signal.currency_pair} | Entry: ${signal.entry_point} | SL: ${signal.stop_loss} | TP: ${signal.take_profit} | Note: ${signal.note}`;
      list.appendChild(item);
    });
  } else {
    list.innerHTML = '<li>No signals posted yet.</li>';
  }
}

loadSignals();
