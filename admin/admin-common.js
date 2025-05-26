// Session Check
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
  }
}

// Toast Notification
function showToast(msg, ok = true) {
  const id = 't' + Date.now();
  document.getElementById('toast-container').insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-white ${ok ? 'bg-success' : 'bg-danger'} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  new bootstrap.Toast(document.getElementById(id), { delay: 3000 }).show();
}

// File Upload
async function uploadFile(file, bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(path).data;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    showToast('File upload failed', false);
    throw error;
  }
}

// Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'admin-login.html';
}

// Theme Management
function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-toggle').textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// Sidebar Management
function initSidebar() {
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (collapsed) {
    document.getElementById('sidebar').classList.add('collapsed');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

// Clock Update
function updateClock() {
  document.getElementById('current-datetime').textContent = new Date().toLocaleString();
}
