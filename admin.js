// admin.js

const supabase = supabase.createClient(
  "https://dapwpgvnfjcfqqhrpxla.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ"
);

// Check auth status
async function checkAdminAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }

  const user = session.user;
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleError || !roleData || roleData.role !== "admin") {
    alert("Unauthorized: Admins only.");
    await supabase.auth.signOut();
    window.location.href = "admin-login.html";
  }
}

// Run auth check on load
checkAdminAuth();

// Add logout button listener
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "admin-login.html";
    });
  }
});
