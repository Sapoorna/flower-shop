// 💳 Checkout Page Script
console.log("Checkout page loaded!");

document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser) {
    showToast("Please login to checkout", "error");
    setTimeout(
      () => (window.location.href = "login.html?redirect=checkout"),
      1500
    );
    return;
  }

  renderOrderSummary();
  setupFormValidation();
  updateCartCount();
  prefillUserInfo(loggedInUser);
});

function prefillUserInfo(user) {
  const emailField = document.getElementById("email");
  if (emailField && user.email) emailField.value = user.email;

  const nameParts = user.name.split(" ");
  const firstNameField = document.getElementById("first-name");
  const lastNameField = document.getElementById("last-name");

  if (firstNameField && nameParts[0]) firstNameField.value = nameParts[0];
  if (lastNameField && nameParts[1]) lastNameField.value = nameParts.slice(1).join(" ");
}

function renderOrderSummary() {
  const orderItemsContainer = document.getElementById("order-items");
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    showToast("Your cart is empty", "error");
    setTimeout(() => (window.location.href = "cart.html"), 2000);
    return;
  }

  orderItemsContainer.innerHTML = "";
  let subtotal = 0;

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const orderItem = document.createElement("div");
    orderItem.className = "order-item";
    orderItem.innerHTML = `
      <div class="order-item-info">
        <div class="order-item-name">${item.name}</div>
        <div class="order-item-details">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
      </div>
      <div class="order-item-price">$${itemTotal.toFixed(2)}</div>
    `;
    orderItemsContainer.appendChild(orderItem);
  });

  updateSummary(subtotal);
}

function updateSummary(subtotal) {
  const shipping = 5.0;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  document.getElementById("summary-subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("summary-shipping").textContent = `$${shipping.toFixed(2)}`;
  document.getElementById("summary-tax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("summary-total").textContent = `$${total.toFixed(2)}`;
}

function setupFormValidation() {
  const form = document.getElementById("checkout-form");
  const checkoutBtn = form.querySelector(".checkout-btn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (validateForm()) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Processing...";
      processOrder().finally(() => {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "Place Order";
      });
    }
  });

  const inputs = form.querySelectorAll("input, select");
  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      validateField(this);
    });
    input.addEventListener("input", function () {
      clearError(this);
    });
  });
}

function validateForm() {
  const form = document.getElementById("checkout-form");
  const inputs = form.querySelectorAll("input[required], select[required]");
  let isValid = true;
  inputs.forEach((input) => {
    if (!validateField(input)) isValid = false;
  });
  return isValid;
}

function validateField(field) {
  const value = field.value.trim();
  clearError(field);
  if (field.hasAttribute("required") && !value) {
    showError(field, "This field is required");
    return false;
  }
  if (field.type === "email" && value && !isValidEmail(value)) {
    showError(field, "Please enter a valid email address");
    return false;
  }
  return true;
}

function showError(field, message) {
  const error = document.createElement("div");
  error.className = "error-message";
  error.textContent = message;
  error.style.color = "#dc3545";
  error.style.fontSize = "0.8rem";
  error.style.marginTop = "0.25rem";
  field.style.borderColor = "#dc3545";
  field.parentNode.appendChild(error);
}

function clearError(field) {
  field.style.borderColor = "";
  const error = field.parentNode.querySelector(".error-message");
  if (error) error.remove();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ✅ FIXED: Single order process (no double notification)
async function processOrder() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    showToast("Your cart is empty", "error");
    window.location.href = "cart.html";
    return;
  }

  const firstName = document.getElementById("first-name").value.trim();
  const lastName = document.getElementById("last-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const totalStr = document.getElementById("summary-total").textContent || "0";
  const totalPrice = parseFloat(totalStr.replace(/[^0-9.-]+/g, "")) || 0;

  // ENSURE PROPER PAYLOAD FORMAT
  const payload = {
    products: cart.map((item) => ({
      productId: item.id || item.name, // Make sure this matches what backend expects
      quantity: item.quantity || 1
    })),
    totalPrice: totalPrice,
    customerName: `${firstName} ${lastName}`.trim(),
    customerEmail: email,
    customerPhone: phone
  };

  console.log("Sending order payload:", payload);

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `Order failed: ${res.status}`);
    }

    const data = await res.json();
    
    // Clear cart and redirect
    localStorage.removeItem("cart");
    updateCartCount();
    
    showToast("✅ Order placed successfully!", "success");
    
    setTimeout(() => {
      window.location.href = `profile.html?section=orders&order=${data._id}`;
    }, 1500);
    
  } catch (err) {
    console.error("Order error:", err);
    showToast(`❌ ${err.message || "Error placing order"}`, "error");
  }
}

function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? "inline-flex" : "none";
  }
}
