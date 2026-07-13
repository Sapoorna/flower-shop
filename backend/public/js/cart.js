// 🛒 Cart Page Script
console.log("Cart page loaded!");

document.addEventListener('DOMContentLoaded', function() {
  renderCart();
  updateCartCount();
});

function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const emptyCart = document.getElementById('empty-cart');
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '';
    emptyCart.style.display = 'block';
    updateSummary(0, true); // Pass true for empty cart
    return;
  }
  
  emptyCart.style.display = 'none';
  cartItemsContainer.innerHTML = '';
  
  let subtotal = 0;
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-content">
        <h3>${item.name}</h3>
        <p>$${item.price.toFixed(2)} each</p>
        <div class="cart-item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity - 1})">-</button>
            <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                   onchange="updateQuantity(${index}, parseInt(this.value))">
            <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
          </div>
          <button class="remove-btn" onclick="removeItem(${index})">
            <i data-feather="trash-2"></i> Remove
          </button>
        </div>
      </div>
      <div class="cart-item-price">
        $${itemTotal.toFixed(2)}
      </div>
    `;
    
    cartItemsContainer.appendChild(cartItem);
  });
  
  updateSummary(subtotal, false); // Pass false for non-empty cart
  
  // Refresh icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

function updateQuantity(index, newQuantity) {
  if (newQuantity < 1) newQuantity = 1;
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (index >= 0 && index < cart.length) {
    cart[index].quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
  }
}

function removeItem(index) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
  }
}

function updateSummary(subtotal, isEmpty) {
  const shipping = isEmpty ? 0 : 5.00; // No shipping for empty cart
  const tax = isEmpty ? 0 : subtotal * 0.05; // No tax for empty cart
  const total = subtotal + shipping + tax;
  
  document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cart-shipping').textContent = isEmpty ? 'FREE' : `$${shipping.toFixed(2)}`;
  document.getElementById('cart-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
  
  // Disable checkout button if cart is empty
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) {
    if (isEmpty) {
      checkoutBtn.style.opacity = '0.6';
      checkoutBtn.style.pointerEvents = 'none';
      checkoutBtn.textContent = 'Cart is Empty';
    } else {
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.pointerEvents = 'auto';
      checkoutBtn.textContent = 'Proceed to Checkout';
    }
  }
}

// Update cart count badge
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
  }
}