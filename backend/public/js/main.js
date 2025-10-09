// 🌸 Global JavaScript for Bloom & Brew

document.addEventListener('DOMContentLoaded', function() {
  console.log("Bloom & Brew - Main JS loaded!");
  
  // Mobile navigation toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });
  }
  
  // Highlight active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage || 
        (currentPage === '' && linkHref === 'index.html') ||
        (currentPage.includes('?') && linkHref === currentPage.split('?')[0])) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Close mobile menu when clicking on a link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
      if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
      }
    });
  });

  // Initialize Feather Icons and AOS
  initializeLibraries();
  
  // Initial updates
  updateProfileDropdown();
  updateCartCount();
});

function initializeLibraries() {
  // Feather Icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
  
  // AOS (Animate On Scroll)
  if (typeof AOS !== 'undefined') {
    AOS.init({ 
      duration: 800, 
      easing: 'ease-in-out', 
      once: true,
      offset: 100
    });
  }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Password toggle functionality
document.querySelectorAll('.password-toggle').forEach(toggle => {
  toggle.addEventListener('click', function() {
    const input = this.parentElement.querySelector('input');
    const icon = this.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('data-feather', 'eye-off');
    } else {
      input.type = 'password';
      icon.setAttribute('data-feather', 'eye');
    }
    
    if (typeof feather !== 'undefined') feather.replace();
  });
});

// Password strength indicator (for signup page)
const passwordInput = document.getElementById('password');
if (passwordInput) {
  passwordInput.addEventListener('input', function() {
    const strengthBar = this.parentElement.querySelector('.strength-bar');
    const strengthText = this.parentElement.querySelector('.strength-text');
    
    if (strengthBar && strengthText) {
      const strength = calculatePasswordStrength(this.value);
      strengthBar.style.width = strength.percentage + '%';
      strengthBar.style.backgroundColor = strength.color;
      strengthBar.className = 'strength-bar ' + strength.class;
      strengthText.textContent = strength.text;
      strengthText.style.color = strength.color;
    }
  });
}

function calculatePasswordStrength(password) {
  let strength = 0;
  let feedback = [];
  
  if (password.length >= 8) strength += 25;
  else feedback.push('at least 8 characters');
  
  if (/[A-Z]/.test(password)) strength += 25;
  else feedback.push('one uppercase letter');
  
  if (/[0-9]/.test(password)) strength += 25;
  else feedback.push('one number');
  
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  else feedback.push('one special character');
  
  if (strength <= 25) {
    return { 
      percentage: strength, 
      color: '#dc3545', 
      class: 'weak',
      text: 'Weak' + (feedback.length ? ' - Needs ' + feedback.join(', ') : '')
    };
  }
  if (strength <= 50) {
    return { 
      percentage: strength, 
      color: '#fd7e14', 
      class: 'fair',
      text: 'Fair' + (feedback.length ? ' - Add ' + feedback.join(', ') : '')
    };
  }
  if (strength <= 75) {
    return { 
      percentage: strength, 
      color: '#ffc107', 
      class: 'good',
      text: 'Good' + (feedback.length ? ' - ' + feedback.join(', ') : '')
    };
  }
  return { 
    percentage: strength, 
    color: '#198754', 
    class: 'strong',
    text: 'Strong - Great password!'
  };
}

// Update cart count badge
function updateCartCount() {
  const cartCountElements = document.querySelectorAll('#cart-count');
  if (cartCountElements.length > 0) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    
    cartCountElements.forEach(element => {
      element.textContent = totalItems;
      element.style.display = totalItems > 0 ? 'inline-flex' : 'none';
      element.classList.toggle('has-items', totalItems > 0);
    });
  }
}
window.updateCartCount = updateCartCount;

// Check if user is logged in and update profile dropdown
function updateProfileDropdown() {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileLinks = document.querySelectorAll('.nav-link[href*="profile"], .dropdown-toggle');
  
  if (profileDropdown) {
    if (loggedInUser) {
      profileDropdown.innerHTML = `
        <a href="profile.html" class="dropdown-item"><i data-feather="user"></i> Profile</a>
        <a href="profile.html?section=orders" class="dropdown-item"><i data-feather="shopping-bag"></i> Orders</a>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item" id="nav-logout-btn"><i data-feather="log-out"></i> Logout</a>
      `;
      
      // Update profile links to show active state only when appropriate
      profileLinks.forEach(link => {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'profile.html' || currentPage === 'login.html' || currentPage === 'signup.html') {
          link.classList.add('active');
        }
      });
      
      // Add logout event listener
      setTimeout(() => {
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('loggedInUser');
            showToast('✅ You have been logged out!', 'success');
            setTimeout(() => window.location.href = 'index.html', 1500);
          });
        }
      }, 100);
      
    } else {
      profileDropdown.innerHTML = `
        <a href="login.html" class="dropdown-item"><i data-feather="log-in"></i> Login</a>
        <a href="signup.html" class="dropdown-item"><i data-feather="user-plus"></i> Sign Up</a>
      `;
      
      // Remove active state from profile links on auth pages
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === 'login.html' || currentPage === 'signup.html') {
        profileLinks.forEach(link => link.classList.remove('active'));
      }
    }
    
    if (typeof feather !== 'undefined') feather.replace();
  }
}

// 🌸 Global Toast Notification Function
function showToast(message, type = 'success', duration = 3000) {
  // Remove any existing toasts that might be stuck
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
  
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Get the appropriate icon for each type
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';
  if (type === 'info') iconName = 'info';
  if (type === 'warning') iconName = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-feather="${iconName}"></i>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Remove toast after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, duration);
  
  // Update Feather icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}
window.showToast = showToast;

// Enhanced error handling for cart operations
window.handleAddToCart = function(productCard, customPrice = null) {
  try {
    const itemName = productCard.querySelector('h3').textContent;
    let itemPrice;
    
    if (customPrice !== null) {
      itemPrice = customPrice;
    } else {
      const priceElement = productCard.querySelector('.price');
      if (!priceElement) {
        throw new Error('Price element not found');
      }
      itemPrice = parseFloat(priceElement.textContent.replace('$', '').replace(',', ''));
    }
    
    if (isNaN(itemPrice)) {
      throw new Error('Invalid price format');
    }
    
    // ✅ CREATE UNIQUE ID
    const id = itemName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '') + '-' + itemPrice;
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const imageElement = productCard.querySelector('img');
      cart.push({
        id: id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        image: imageElement ? imageElement.src : ''
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    if (typeof updateCartCount === "function") {
      updateCartCount();
    }
    
    showToast(`Added ${itemName} to cart!`, 'success');
    return true;
  } catch (error) {
    console.error('Add to cart error:', error);
    showToast('Failed to add item to cart. Please try again.', 'error');
    return false;
  }
};