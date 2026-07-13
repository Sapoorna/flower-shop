// 🌸 Home Page JavaScript
console.log("Welcome to Bloom & Brew Home Page!");

document.addEventListener('DOMContentLoaded', function() {
  // Add to cart functionality for home page
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
      const productCard = this.closest('.product-card');
      const itemName = productCard.querySelector('h3').textContent;
      const itemPrice = parseFloat(productCard.querySelector('.price').textContent.replace('$', ''));
      
      // ✅ CREATE UNIQUE ID (same as other pages)
      const id = itemName.toLowerCase().replace(/ /g, '-') + '-' + itemPrice;
      
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existingItem = cart.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: id,
          name: itemName,
          price: itemPrice,
          quantity: 1,
          image: productCard.querySelector('img').src
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      
      if (typeof updateCartCount === "function") {
        updateCartCount();
      }
      
      showToast(`Added ${itemName} to cart!`, 'success');
    });
  });
  
  // Initialize AOS animations
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true
    });
  }
});