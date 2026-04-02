document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Fixed: Use correct field IDs from the HTML
    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const name = `${firstName} ${lastName}`; // Combine first and last name
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;
    
    if (password !== confirm) {
      return showToast("Passwords do not match", "error");
    }
    
    // Check if terms are agreed
    const termsAgreed = document.getElementById("terms").checked;
    if (!termsAgreed) {
      return showToast("Please agree to the Terms of Service", "error");
    }
    
    const user = { name, email, password };
    localStorage.setItem("user", JSON.stringify(user));
    showToast("Account created successfully!", "success");
    setTimeout(() => location.href = "login.html", 1500);
  });
});