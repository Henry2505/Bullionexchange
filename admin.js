// admin.js

// Function to fetch users and populate the table
async function fetchUsers() {
  const { data, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const tableBody = document.querySelector('#users-table-body');
  tableBody.innerHTML = ''; // Clear any existing rows

  data.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.email}</td>
      <td>${user.name}</td>
      <td>${user.status}</td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td><button class="edit-btn" data-id="${user.id}">Edit</button></td>
    `;
    tableBody.appendChild(row);
  });
}

// Open modal and populate form for editing
document.querySelector('#users-table-body').addEventListener('click', async (e) => {
  if (e.target.classList.contains('edit-btn')) {
    const userId = e.target.dataset.id;

    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error) {
      console.error('Error fetching user data:', error);
      return;
    }

    // Populate the form with current user data
    document.getElementById('user-email').value = data.email;
    document.getElementById('user-name').value = data.name;
    document.getElementById('user-status').value = data.status;

    // Show modal
    document.getElementById('user-modal').style.display = 'block';

    // Handle form submission
    document.getElementById('user-form').onsubmit = async (event) => {
      event.preventDefault();

      const updatedData = {
        email: document.getElementById('user-email').value,
        name: document.getElementById('user-name').value,
        status: document.getElementById('user-status').value,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return;
      }

      alert('User updated successfully');
      document.getElementById('user-modal').style.display = 'none';
      fetchUsers(); // Refresh the user list
    };
  }
});

// Close the modal
document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('user-modal').style.display = 'none';
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  fetchUsers();
});
