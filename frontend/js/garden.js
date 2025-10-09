// 🌸 Garden Experience Page Script
console.log("Garden experience page loaded!");

document.addEventListener("DOMContentLoaded", function () {
  const bookingCards = document.querySelectorAll(".booking-card .btn");

  bookingCards.forEach((button) => {
    button.addEventListener("click", function () {
      const card = this.closest(".booking-card");
      const planName = card.querySelector("h3").textContent.trim();
      const priceElement = card.querySelector(".price") || card.querySelector(".plan-price");
      const imageElement = card.querySelector("img");

      // Extract price (default to 0 if not found)
      let price = 0;
      if (priceElement) {
        const priceText = priceElement.textContent.replace(/[^0-9.]+/g, "");
        price = parseFloat(priceText) || 0;
      }

      const image = imageElement ? imageElement.src : "images/garden-default.jpg";

      // Create booking item
      const bookingItem = {
        id: `garden-${planName.replace(/\s+/g, "-").toLowerCase()}`,
        name: `Garden Experience: ${planName}`,
        price: price,
        quantity: 1,
        image: image,
        type: "garden",
      };

      // Add to cart in localStorage
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingItem = cart.find((item) => item.id === bookingItem.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push(bookingItem);
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();

      showToast(`🌿 ${planName} added to your cart!`, "success");
    });
  });

  // Update cart badge if available
  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
});
