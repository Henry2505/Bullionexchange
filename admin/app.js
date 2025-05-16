// Sections content templates
const sections = {
  dashboard:   `<div class="card">Welcome to the <strong>Dashboard</strong>. Here you can see key metrics.</div>`,
  signals:     `<div class="card"><h2>Signals</h2><p>Publish and manage daily signals here.</p></div>`,
  payments:    `<div class="card"><h2>Payments</h2><p>Approve or reject user payments.</p></div>`,
  messages:    `<div class="card"><h2>Messages</h2><p>Inbox and broadcast messages.</p></div>`,
  users:       `<div class="card"><h2>Users</h2><p>View, approve, delete users.</p></div>`,
  history:     `<div class="card"><h2>Trade History</h2><p>Upload and view past VIP trades.</p></div>`,
  settings:    `<div class="card"><h2>Settings</h2><p>Manage wallet addresses & email templates.</p></div>`
};

// Sidebar navigation logic
const navItems      = document.querySelectorAll('.sidebar nav li');
const titleEl       = document.getElementById('section-title');
const contentArea   = document.getElementById('section-content');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    // Update active state
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    // Load content
    const sec = item.dataset.section;
    titleEl.textContent = item.textContent;
    contentArea.innerHTML = sections[sec];
  });
});

// Logout placeholder
document.getElementById('logout-btn').addEventListener('click', () => {
  alert('Logging out…');
  // TODO: hook into real auth
});

// Initialize
contentArea.innerHTML = sections.dashboard;
