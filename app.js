// Initialize Supabase
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const createSignalForm = document.getElementById('create-signal-form');
const signalNameInput = document.getElementById('signal-name');
const signalTypeInput = document.getElementById('signal-type');
const signalValueInput = document.getElementById('signal-value');
const signalsList = document.getElementById('signals-list');

// Function to fetch and display all signals
async function fetchSignals() {
    const { data, error } = await supabase
        .from('signals')  // Replace with your table name in Supabase
        .select('*');

    if (error) {
        console.error('Error fetching signals:', error);
        return;
    }

    // Clear the current list
    signalsList.innerHTML = '';

    // Display signals
    data.forEach(signal => {
        const li = document.createElement('li');
        li.textContent = `${signal.name} - ${signal.type} - ${signal.value}`;
        signalsList.appendChild(li);
    });
}

// Handle form submission to create a new signal
createSignalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newSignal = {
        name: signalNameInput.value,
        type: signalTypeInput.value,
        value: signalValueInput.value
    };

    // Insert the new signal into Supabase
    const { data, error } = await supabase
        .from('signals')  // Replace with your table name in Supabase
        .insert([newSignal]);

    if (error) {
        console.error('Error inserting new signal:', error);
        return;
    }

    // Clear form fields after successful submission
    signalNameInput.value = '';
    signalTypeInput.value = '';
    signalValueInput.value = '';

    // Refresh the signals list
    fetchSignals();
});

// Load signals when page loads
window.onload = fetchSignals;
