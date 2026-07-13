// 🌸 Login Page - Connected to Backend!
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
      return showToast("Please fill in all fields", "error");
    }
    
    try {
      //  Send to BACKEND (not localStorage!)
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      //  Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('loggedInUser', JSON.stringify(data.user));
      
      showToast(' Login successful!', 'success');
      
      //  Redirect to profile or previous page
      setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'profile.html';
        window.location.href = redirect;
      }, 1500);
      
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed. Please try again.', 'error');
    }
  });
});