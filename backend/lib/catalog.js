const catalog = require('../public/catalog.json');
function quote(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50)
    throw Object.assign(Error('Your bag must contain between 1 and 50 items.'), { status: 400 });
  const seen = new Set();
  const products = items.map((item) => {
    const p = catalog.products.find((p) => p.id === item.productId && p.available);
    if (
      !p ||
      seen.has(p.id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    )
      throw Object.assign(Error('An item or quantity is invalid. Please update your bag.'), {
        status: 400
      });
    seen.add(p.id);
    return {
      productId: p.id,
      name: p.name,
      unitPrice: p.price,
      quantity: item.quantity,
      image: p.image
    };
  });
  const subtotal = products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  return {
    products,
    subtotal,
    deliveryFee: catalog.deliveryFee,
    totalPrice: subtotal + catalog.deliveryFee,
    currency: 'LKR'
  };
}
module.exports = { catalog, quote };
