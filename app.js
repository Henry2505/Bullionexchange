// Initialize Supabase client
const supabaseUrl = 'https://your-project-url.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'your-anon-key'; // Replace with your Supabase anon/public key
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const createSignalForm = document.getElementById('create-signal-form');
const signalNameInput = document.getElementById('signal-name');
const signalTypeInput = document.getElementById('signal-type');
const signalValueInput = document.getElementById('signal-value');
const signalsList = document.getElementById('signals-list');

// Fetch all signals from Supabase
async function fetchSignals() {
  const { data, error } = await supabase.from('signals').select('*');

  if (error) {
    console.error('Error fetching signals:', error.message);
    return;
  }

  signalsList.innerHTML = '';

  data.forEach(signal => {
    const li = document.createElement('li');
    li.textContent = `${signal.name} | ${signal.type} | ${signal.value}`;
    signalsList.appendChild(li);
  });
}

// Handle signal form submission
createSignalForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newSignal = {
    name: signalNameInput.value,
    type: signalTypeInput.value,
    value: signalValueInput.value,
  };

  const { error } = await supabase.from('signals').insert([newSignal]);

  if (error) {
    console.error('Error creating signal:', error.message);
    return;
  }

  // Clear form
  signalNameInput.value = '';
  signalTypeInput.value = '';
  signalValueInput.value = '';

  // Refresh list
  fetchSignals();
});

// Load signals on page load
window.addEventListener('DOMContentLoaded', fetchSignals);
