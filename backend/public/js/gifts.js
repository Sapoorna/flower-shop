// 🌸 Gifts Page Script
console.log("Gifts page loaded!");

document.addEventListener('DOMContentLoaded', function() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  const giftCards = document.querySelectorAll('.product-card');
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.getAttribute('data-category');
      
      giftCards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
  
  // Add to cart functionality
  const addToCartButtons = document.querySelectorAll('.add-to-cart');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
      const giftCard = this.closest('.product-card');
      const itemName = giftCard.querySelector('h3').textContent;
      
      let itemPrice;
      const voucherSelect = giftCard.querySelector('.voucher-amount');
      
      if (voucherSelect) {
        itemPrice = parseFloat(voucherSelect.value);
      } else {
        itemPrice = parseFloat(giftCard.querySelector('.price').textContent.replace('$', ''));
      }
      
      // ✅ ADDED THIS LINE TO CREATE A UNIQUE ID
      const id = itemName.toLowerCase().replace(/ /g, '-') + '-' + itemPrice;

      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existingItem = cart.find(item => item.id === id); // Now we check by ID
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: id, // And we save the ID
          name: itemName,
          price: itemPrice,
          quantity: 1,
          image: giftCard.querySelector('img').src
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));

      if (typeof updateCartCount === "function") {
        updateCartCount();
      }
      
      showToast(`Added ${itemName} to cart!`, 'success');
    });
  });
  
  // Custom Gift Modal Functionality
  const customGiftModal = document.getElementById('customGiftModal');
  const closeModalBtn = document.querySelector('.close-modal');
  const customGiftForm = document.getElementById('customGiftForm');
  
  // Open modal function
  window.openCustomGiftModal = function() {
    if (customGiftModal) {
      customGiftModal.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
  };
  
  // Close modal function
  window.closeCustomGiftModal = function() {
    if (customGiftModal) {
      customGiftModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
  };
  
  // Close modal when clicking X
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeCustomGiftModal);
  }
  
  // Close modal when clicking outside
  if (customGiftModal) {
    customGiftModal.addEventListener('click', function(event) {
      if (event.target === customGiftModal) {
        closeCustomGiftModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && customGiftModal && customGiftModal.style.display === 'block') {
      closeCustomGiftModal();
    }
  });
  
  // Handle form submission
  if (customGiftForm) {
    customGiftForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(customGiftForm);
      const name = customGiftForm.querySelector('input[type="text"]').value;
      const email = customGiftForm.querySelector('input[type="email"]').value;
      const occasion = customGiftForm.querySelector('select').value;
      const message = customGiftForm.querySelector('textarea').value;
      
      // Here you would typically send the data to your server
      console.log('Custom Gift Request:', {
        name,
        email,
        occasion,
        message,
        timestamp: new Date().toISOString()
      });
      
      // Show success message
      showToast('Thank you! We\'ll contact you within 24 hours about your custom gift request.', 'success');
      
      // Close modal and reset form
      closeCustomGiftModal();
      customGiftForm.reset();
      
      // Optional: You could also send this data to your backend
      // sendCustomGiftRequest({ name, email, occasion, message });
    });
  }
  
  // Function to send data to backend (optional)
  function sendCustomGiftRequest(data) {
    fetch(`${API_BASE}/api/custom-gift-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  }
  
  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
});

// Toast notification function
function showToast(message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
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
  }, 3000);
  
  // Update Feather icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}