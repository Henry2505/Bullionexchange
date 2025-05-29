// auth-guard.js

// Immediately redirect to login if the user isn't marked "logged in"
if (sessionStorage.getItem('cbeLoggedIn') !== 'true') {
  window.location.replace('login.html');
}
