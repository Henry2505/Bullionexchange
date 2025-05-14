const supabase = supabase.createClient(
  "https://dapwpgvnfjcfqqhrpxla.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);

window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }

  const user = session.user;
  const { data: roleData, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error || !roleData || roleData.role !== "admin") {
    await supabase.auth.signOut();
    window.location.href = "admin-login.html";
  }
});

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "admin-login.html";
}
