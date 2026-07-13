// 👤 Profile Page Script - FULLY WORKING VERSION
const API_BASE = '';

document.addEventListener("DOMContentLoaded", async function() {
  console.log("Profile page loaded!");
  
  const token = localStorage.getItem('token');
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  
  // ✅ Check if user is logged in
  if (!token || !loggedInUser) {
    showToast("Please login to view your profile", "error");
    setTimeout(() => window.location.href = "login.html?redirect=profile", 2000);
    return;
  }

  // Display user info
  document.getElementById("user-name").textContent = `${loggedInUser.firstName || ''} ${loggedInUser.lastName || ''}`.trim() || 'User';
  document.getElementById("user-email").textContent = loggedInUser.email || '';

  // ✅ Fetch real user data from backend
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update UI with fresh data
      document.getElementById("user-name").textContent = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || 'User';
      document.getElementById("user-email").textContent = data.user.email || '';
      
      // Update localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(data.user));
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  // Load orders
  await loadOrdersFromDB();
  handleOrdersSection();

  // ✅ EDIT PROFILE BUTTON - FIXED
  const editProfileBtn = document.querySelector('.profile-actions .btn:first-child');
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", function(e) {
      e.preventDefault();
      const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
      if (loggedInUser) {
        showEditProfileModal(loggedInUser);
      } else {
        showToast("Please login first", "error");
      }
    });
  }
  
  // ✅ LOGOUT BUTTON - FIXED (uses global logoutUser from main.js)
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        // Use the global logoutUser function from main.js
        if (typeof logoutUser === 'function') {
          logoutUser();
        } else {
          // Fallback if main.js hasn't loaded
          localStorage.removeItem('token');
          localStorage.removeItem('loggedInUser');
          showToast('✅ Logged out successfully!', 'success');
          setTimeout(() => window.location.href = 'login.html', 1500);
        }
      }
    });
  }
});

// ✅ HANDLE ORDERS SECTION (scroll to orders if redirected)
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

// ✅ LOAD ORDERS FROM DATABASE
async function loadOrdersFromDB() {
  const orderList = document.getElementById("order-list");
  if (!orderList) return;

  const token = localStorage.getItem('token');
  if (!token) {
    orderList.innerHTML = `<p>Please login to view orders</p>`;
    return;
  }

  orderList.innerHTML = `<p>Loading your orders...</p>`;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
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
      // Refresh icons
      if (typeof feather !== 'undefined') feather.replace();
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

// ✅ VIEW ORDER DETAILS (Modal)
async function viewOrderDetails(orderId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const orders = await res.json();
    const order = orders.find(o => o._id === orderId);
    if (!order) return showToast("Order not found", "error");

    const itemsList = order.products.map(p => `${p.quantity} × ${p.productId}`).join("<br>");
    
    // Remove existing modal if any
    const existingModal = document.getElementById('orderModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'orderModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:500px; position:relative;">
        <button class="close-modal" onclick="closeOrderModal()">&times;</button>
        <h3>📦 Order Details</h3>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
        <p><strong>Status:</strong> <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span></p>
        <hr>
        <h4>Items:</h4>
        <p>${itemsList}</p>
        <hr>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
        <button class="btn" onclick="closeOrderModal()" style="margin-top:1rem; width:100%;">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeOrderModal();
    });
    
    if (typeof feather !== 'undefined') feather.replace();
  } catch (error) {
    console.error('Error loading order details:', error);
    showToast("Error loading order details", "error");
  }
}

// ✅ CLOSE ORDER MODAL
function closeOrderModal() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.remove();
}

// ✅ SHOW EDIT PROFILE MODAL
function showEditProfileModal(user) {
  // Remove existing modal if any
  const existingModal = document.getElementById('editProfileModal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'editProfileModal';
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; position: relative;">
      <button class="close-modal" onclick="closeEditModal()">&times;</button>
      <h3>✏️ Edit Profile</h3>
      <form id="edit-profile-form">
        <div class="form-group">
          <label for="edit-first-name">First Name</label>
          <input type="text" id="edit-first-name" value="${user.firstName || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-last-name">Last Name</label>
          <input type="text" id="edit-last-name" value="${user.lastName || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-email">Email Address</label>
          <input type="email" id="edit-email" value="${user.email || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-phone">Phone Number (Optional)</label>
          <input type="tel" id="edit-phone" value="${user.phone || ''}">
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
          <button type="submit" class="btn" style="flex: 1;">Save Changes</button>
          <button type="button" class="btn btn-secondary" onclick="closeEditModal()" style="flex: 1;">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
  
  // Handle form submission
  document.getElementById('edit-profile-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveProfileChanges();
  });
  
  if (typeof feather !== 'undefined') feather.replace();
}

// ✅ CLOSE EDIT MODAL
function closeEditModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

// ✅ SAVE PROFILE CHANGES
async function saveProfileChanges() {
  const firstName = document.getElementById('edit-first-name').value.trim();
  const lastName = document.getElementById('edit-last-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  
  // Validate
  if (!firstName || !lastName || !email) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login first', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName,
        lastName,
        phone
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }
    
    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('loggedInUser')) || {};
    const updatedUser = {
      ...currentUser,
      firstName,
      lastName,
      phone,
      email
    };
    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
    
    // Update UI
    document.getElementById("user-name").textContent = `${firstName} ${lastName}`;
    document.getElementById("user-email").textContent = email;
    
    closeEditModal();
    showToast('Profile updated successfully!', 'success');
    
    // Update dropdown in main.js
    if (typeof updateProfileDropdown === 'function') {
      updateProfileDropdown();
    }
    
  } catch (error) {
    console.error('Update error:', error);
    showToast(error.message || 'Failed to update profile', 'error');
  }
}

// ✅ VALIDATE EMAIL
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ✅ LOGOUT HANDLER (used by profile page)
function handleLogout(e) {
  if (e) e.preventDefault();
  
  if (confirm('Are you sure you want to logout?')) {
    // Use global logoutUser if available
    if (typeof logoutUser === 'function') {
      logoutUser();
    } else {
      // Fallback
      localStorage.removeItem('token');
      localStorage.removeItem('loggedInUser');
      showToast('✅ Logged out successfully!', 'success');
      setTimeout(() => window.location.href = 'login.html', 1500);
    }
  }
}

// ✅ Make functions globally accessible
window.closeEditModal = closeEditModal;
window.closeOrderModal = closeOrderModal;
window.showEditProfileModal = showEditProfileModal;
window.handleLogout = handleLogout;