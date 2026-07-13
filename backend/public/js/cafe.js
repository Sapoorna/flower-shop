// 🌸 Café Menu Page Script
console.log("Café menu page loaded!");

document.addEventListener('DOMContentLoaded', function() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  const menuItems = document.querySelectorAll('.product-card'); // ✅ Changed from '.menu-item' to '.product-card'
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.getAttribute('data-category');
      
      menuItems.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
  
  // Add to cart functionality
const addToCartButtons = document.querySelectorAll('.add-to-cart');
addToCartButtons.forEach(button => {
  button.addEventListener('click', function() {
    const menuItem = this.closest('.product-card'); // Make sure this selector is correct
    const itemName = menuItem.querySelector('h3').textContent;
    const itemPrice = parseFloat(menuItem.querySelector('.price').textContent.replace('$', ''));
    
    // ✅ CREATE UNIQUE ID
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
        image: menuItem.querySelector('img').src
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    if (typeof updateCartCount === "function") {
      updateCartCount();
    }
    
    showToast(`Added ${itemName} to cart!`, 'success');
  });
});
});