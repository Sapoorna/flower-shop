document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;
  
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    
    if (!email || !pass) {
      return showToast("Please fill in all fields", "error");
    }
    
    const saved = JSON.parse(localStorage.getItem("user"));
    if (!saved) {
      return showToast("No account found. Please sign up first.", "error");
    }
    
    if (saved.email === email && saved.password === pass) {
      localStorage.setItem("loggedInUser", JSON.stringify(saved));
      showToast("Login successful! Redirecting...", "success");
      setTimeout(() => location.href = "profile.html", 1500);
    } else {
      showToast("Invalid email or password", "error");
    }
  });
});