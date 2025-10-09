// 👤 Profile Page Script
document.addEventListener("DOMContentLoaded", function() {
  console.log("Profile page loaded!");
  
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser) {
    showToast("Please login to view your profile", "error");
    setTimeout(() => window.location.href = "login.html?redirect=profile", 2000);
    return;
  }

  document.getElementById("user-name").textContent = loggedInUser.name;
  document.getElementById("user-email").textContent = loggedInUser.email;
  
  handleOrdersSection();

  const editProfileBtn = document.querySelector('.btn:not(.btn-secondary)');
  if (editProfileBtn)
    editProfileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showEditProfileModal(loggedInUser);
    });
  
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  loadOrdersFromDB();
});

function handleOrdersSection() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order');
  if (urlParams.get('section') === 'orders' || orderId) {
    setTimeout(() => {
      const ordersSection = document.querySelector('.orders-card');
      if (ordersSection) {
        ordersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ordersSection.style.boxShadow = '0 0 0 2px #10b981';
        setTimeout(() => { ordersSection.style.boxShadow = ''; }, 3000);
        if (orderId) showToast(`Order ${orderId} placed successfully!`, 'success', 4000);
      }
    }, 500);
  }
}

// ✅ FIXED: load real orders and show detailed error
async function loadOrdersFromDB() {
  const orderList = document.getElementById("order-list");
  if (!orderList) return;

  orderList.innerHTML = `<p>Loading your orders...</p>`;

  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const orders = await res.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      orderList.innerHTML = `
        <div class="no-orders">
          <i data-feather="shopping-bag"></i>
          <h3>No orders yet</h3>
          <p>Your order history will appear here</p>
          <a href="shop.html" class="btn">Start Shopping</a>
        </div>`;
      return;
    }

    orderList.innerHTML = "";
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toLocaleDateString();
      const html = `
      <div class="order-item">
        <div class="order-info">
          <h3>Order #${order._id.slice(-6)}</h3>
          <p><strong>Date:</strong> ${orderDate}</p>
          <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
        <button class="btn view-order-btn" data-id="${order._id}">View Details</button>
      </div>`;
      orderList.insertAdjacentHTML("beforeend", html);
    });

    document.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', () => viewOrderDetails(btn.dataset.id));
    });

    if (typeof feather !== 'undefined') feather.replace();
  } catch (err) {
    console.error("Error loading orders:", err);
    orderList.innerHTML = `<p style="color:red;">Error loading orders: ${err.message}</p>`;
  }
}

async function viewOrderDetails(orderId) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();
    const order = orders.find(o => o._id === orderId);
    if (!order) return showToast("Order not found", "error");

    const itemsList = order.products.map(p => `${p.quantity} × ${p.productId}`).join("<br>");
    const modal = `
      <div class="modal" id="orderModal" style="display:block;">
        <div class="modal-content" style="max-width:500px;">
          <button class="close-modal" onclick="closeOrderModal()">&times;</button>
          <h3>Order Details</h3>
          <p><strong>ID:</strong> ${order._id}</p>
          <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <hr><p>${itemsList}</p>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", modal);
  } catch {
    showToast("Error loading order details", "error");
  }
}
function closeOrderModal(){const m=document.getElementById("orderModal");if(m)m.remove();}

// edit profile + logout same as before ...
// ✏️ Edit Profile Modal (same as before)
function showEditProfileModal(user) {
  const modalHtml = `
    <div class="modal" id="editProfileModal" style="display: block;">
      <div class="modal-content" style="max-width: 500px;">
        <button class="close-modal" onclick="closeEditModal()">&times;</button>
        <h3>Edit Profile</h3>
        <form id="edit-profile-form">
          <div class="form-group">
            <label for="edit-name">Full Name</label>
            <input type="text" id="edit-name" value="${user.name}" required>
          </div>
          <div class="form-group">
            <label for="edit-email">Email Address</label>
            <input type="email" id="edit-email" value="${user.email}" required>
          </div>
          <div class="form-group">
            <label for="edit-phone">Phone Number (Optional)</label>
            <input type="tel" id="edit-phone" value="${user.phone || ''}">
          </div>
          <button type="submit" class="btn">Save Changes</button>
          <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
        </form>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('editProfileModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.body.style.overflow = 'hidden';
  
  document.getElementById('edit-profile-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveProfileChanges(user);
  });
  
  document.getElementById('editProfileModal').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeEditModal();
  });
}

function closeEditModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

function saveProfileChanges(oldUser) {
  const newName = document.getElementById('edit-name').value.trim();
  const newEmail = document.getElementById('edit-email').value.trim();
  const newPhone = document.getElementById('edit-phone').value.trim();
  
  if (!newName || !newEmail) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (!isValidEmail(newEmail)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }
  
  const updatedUser = {
    ...oldUser,
    name: newName,
    email: newEmail,
    phone: newPhone
  };
  
  localStorage.setItem("user", JSON.stringify(updatedUser));
  localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
  
  document.getElementById("user-name").textContent = newName;
  document.getElementById("user-email").textContent = newEmail;
  
  closeEditModal();
  showToast("Profile updated successfully!", "success");
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Logout handler
function handleLogout(e) {
  if (e) e.preventDefault();
  
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem("loggedInUser");
    showToast("✅ You have been logged out!", "success");
    setTimeout(() => window.location.href = "login.html", 1500);
  }
}
