// 🌸 Shop Flowers Page Script
console.log("Shop flowers page loaded!");

document.addEventListener("DOMContentLoaded", function () {
  // ---------- Filter functionality ----------
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const shopItems = document.querySelectorAll(".product-card"); // ✅ Changed from '.shop-item' to '.product-card'

  // This part of the code is for the shop page filters and does not need to run on the index page.
  if (categoryFilter && sortFilter && shopItems.length > 0) {
    // Category filter
    categoryFilter.addEventListener("change", filterItems);

    // Sort filter
    sortFilter.addEventListener("change", sortItems);

    function filterItems() {
      const category = categoryFilter.value;

      shopItems.forEach((item) => {
        if (
          category === "all" ||
          item.getAttribute("data-category") === category
        ) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    }

    function sortItems() {
      const sortBy = sortFilter.value;
      const container = document.querySelector(".product-grid"); // ✅ Changed from '.shop-grid' to '.product-grid'
      const items = Array.from(shopItems);

      items.sort((a, b) => {
        const priceA = parseFloat(
          a.querySelector(".price").textContent.replace("$", "")
        );
        const priceB = parseFloat(
          b.querySelector(".price").textContent.replace("$", "")
        );

        switch (sortBy) {
          case "price-low":
            return priceA - priceB;
          case "price-high":
            return priceB - priceA;
          case "popular":
            const hasBadgeA = a.querySelector(".product-badge") !== null; // ✅ Changed from '.shop-item-badge' to '.product-badge'
            const hasBadgeB = b.querySelector(".product-badge") !== null;
            return hasBadgeB - hasBadgeA;
          case "newest":
            return items.indexOf(b) - items.indexOf(a);
          default:
            return 0;
        }
      });

      // Clear and re-append sorted items
      container.innerHTML = '';
      items.forEach((item) => container.appendChild(item));
    }
  }

  // ... rest of your add-to-cart code remains the same
  // ---------- Robust Add-to-Cart handler ----------
  document.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", function () {
      // ✅ THIS IS THE CRITICAL FIX - Use the same logic as gifts.js
      const productCard = this.closest(".product-card");
      const itemName = productCard.querySelector("h3").textContent;

      let itemPrice;
      const priceElement = productCard.querySelector(".price");
      if (priceElement) {
        itemPrice = parseFloat(priceElement.textContent.replace("$", ""));
      }

      // ✅ CREATE UNIQUE ID (same as gifts.js)
      const id = itemName.toLowerCase().replace(/ /g, "-") + "-" + itemPrice;

      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingItem = cart.find((item) => item.id === id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: id,
          name: itemName,
          price: itemPrice,
          quantity: 1,
          image: productCard.querySelector("img").src,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      if (typeof updateCartCount === "function") {
        updateCartCount();
      }

      showToast(`Added ${itemName} to cart!`, "success");
    });
  });
});