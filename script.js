function showSection(id) {
  document.querySelectorAll("main section").forEach(sec => {
    sec.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

document.getElementById("signalForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const symbol = document.getElementById("symbol").value;
  const entry = document.getElementById("entry").value;
  const tp = document.getElementById("tp").value;
  const sl = document.getElementById("sl").value;

  const signalHTML = `
    <div class="signal">
      <strong>${symbol}</strong><br>
      Entry: ${entry}, TP: ${tp}, SL: ${sl}
    </div>
  `;
  document.getElementById("signalsList").innerHTML += signalHTML;

  // Clear form
  document.getElementById("signalForm").reset();
});

// Dummy member data (to be replaced with DB integration)
const members = [
  { name: "Onah Chukwuemeka", email: "henrychukwuemeka215@icloud.com", status: "Approved" },
  { name: "Ugwu Chidera", email: "euphemia@example.com", status: "Pending" }
];

function loadMembers() {
  const tbody = document.getElementById("membersTableBody");
  tbody.innerHTML = "";
  members.forEach(member => {
    const row = `<tr><td>${member.name}</td><td>${member.email}</td><td>${member.status}</td></tr>`;
    tbody.innerHTML += row;
  });
}

window.onload = loadMembers;
