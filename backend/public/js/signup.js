// 🌸 Signup Page 
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Get form values
    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;
    
    // Frontend validation
    if (password !== confirm) {
      return showToast("Passwords do not match", "error");
    }
    
    if (password.length < 8) {
      return showToast("Password must be at least 8 characters", "error");
    }
    
    const termsAgreed = document.getElementById("terms").checked;
    if (!termsAgreed) {
      return showToast("Please agree to the Terms of Service", "error");
    }
    
    try {
      //  Send to BACKEND (not localStorage!)
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          phone: document.getElementById("phone")?.value || ''
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      //  Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('loggedInUser', JSON.stringify(data.user));
      
      showToast(' Account created successfully!', 'success');
      
      //  Redirect to profile
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
      
    } catch (error) {
      console.error('Registration error:', error);
      showToast(error.message || 'Registration failed. Please try again.', 'error');
    }
  });
});