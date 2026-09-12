(() => {
  'use strict';
  const page = document.body.dataset.page;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const money = (value) =>
    new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(value);
  let catalog,
    user,
    cart = [],
    toastTimer;
  const quantities = new Map();
  let storageAvailable = true;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('cart');
    cart = JSON.parse(localStorage.getItem('flore-bag-v1') || '[]');
    if (!Array.isArray(cart)) cart = [];
  } catch {
    storageAvailable = false;
  }
  async function api(path, data, method = 'POST') {
    let response;
    try {
      response = await fetch('/api' + path, {
        method: data === undefined ? 'GET' : method,
        credentials: 'same-origin',
        headers:
          data === undefined ? {} : { 'Content-Type': 'application/json', 'X-Flore-Request': '1' },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: AbortSignal.timeout(20000)
      });
    } catch {
      throw new Error('We could not reach the shop. Check your connection and try again.');
    }
    const body = await response
      .json()
      .catch(() => ({ message: 'The shop is temporarily unavailable. Please try again shortly.' }));
    if (!response.ok)
      throw Object.assign(new Error(body.message || 'Something went wrong. Please try again.'), {
        status: response.status
      });
    return body;
  }
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  function saveCart() {
    try {
      localStorage.setItem('flore-bag-v1', JSON.stringify(cart));
    } catch {
      if (storageAvailable) toast('Your browser cannot save this bag. Keep this tab open.');
      storageAvailable = false;
    }
    updateBadge();
  }
  function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    $('#bag-count').textContent = count;
    $('.bag-link').setAttribute('aria-label', `Shopping bag, ${count} items`);
    $$('[data-inbag]').forEach((el) => {
      const n = cart.find((i) => i.id === el.dataset.inbag)?.quantity || 0;
      el.textContent = n ? `${n} in your bag` : '';
    });
  }
  const findProduct = (id) => catalog.products.find((p) => p.id === id);
  function totals() {
    const subtotal = cart.reduce((s, i) => s + findProduct(i.id).price * i.quantity, 0),
      deliveryFee = cart.length ? catalog.deliveryFee : 0;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  }
  function quantityControl(id, value, context = 'card') {
    return `<div class="quantity" data-quantity="${escape(id)}" data-context="${context}"><button type="button" data-step="-1" aria-label="Decrease quantity of ${escape(findProduct(id).name)}" ${value <= 1 ? 'disabled' : ''}>−</button><output aria-label="Quantity">${value}</output><button type="button" data-step="1" aria-label="Increase quantity of ${escape(findProduct(id).name)}" ${value >= 20 ? 'disabled' : ''}>+</button></div>`;
  }
  function empty(title, description, link = '/shop.html', label = 'Explore the flowers') {
    return `<div class="empty-state"><h2>${escape(title)}</h2><p>${escape(description)}</p><a class="button" href="${link}">${escape(label)} <span aria-hidden="true">→</span></a></div>`;
  }
  function productCard(p) {
    return `<article class="product-card"><div class="product-image"><img src="${p.image}" alt="${escape(p.name)}" width="600" height="650" loading="lazy">${p.badge ? `<span class="badge">${escape(p.badge)}</span>` : ''}</div><div class="product-category">${escape(p.category)}</div><div class="product-title"><h3>${escape(p.name)}</h3><span class="price">${money(p.price)}</span></div><p class="product-description">${escape(p.description)}</p><div class="product-actions">${quantityControl(p.id, quantities.get(p.id) || 1)}<button class="add-button" data-add="${p.id}" aria-label="Add ${escape(p.name)} to bag">Add to bag <span aria-hidden="true">+</span></button></div><div class="in-bag" data-inbag="${p.id}" aria-live="polite"></div></article>`;
  }
  function renderCatalog() {
    const grid = $('#product-grid');
    if (!grid) return;
    if (page === 'index') {
      grid.innerHTML = ['blush-roses', 'cappuccino', 'white-lilies', 'butter-croissant']
        .map((id) => productCard(findProduct(id)))
        .join('');
      updateBadge();
      return;
    }
    const section = { shop: 'flowers', cafe: 'cafe', gifts: 'gifts' }[page];
    const all = catalog.products.filter((p) => p.section === section && p.available);
    const filters = $('#filters');
    let active = 'All',
      sort = 'featured',
      query = '';
    filters.innerHTML = ['All', ...new Set(all.map((p) => p.category))]
      .map(
        (c) =>
          `<button type="button" data-filter="${escape(c)}" class="${c === 'All' ? 'active' : ''}" aria-pressed="${c === 'All'}">${escape(c)}</button>`
      )
      .join('');
    function draw() {
      let list = all.filter(
        (p) =>
          (active === 'All' || p.category === active) &&
          (p.name + ' ' + p.description).toLowerCase().includes(query)
      );
      list.sort((a, b) =>
        sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : a.rank - b.rank
      );
      $('#result-count').textContent =
        `${list.length} lovely ${list.length === 1 ? 'find' : 'finds'}`;
      grid.innerHTML = list.length
        ? list.map(productCard).join('')
        : `<div class="empty-state"><h2>Nothing here just yet.</h2><p>Try another word or browse the full collection.</p><button id="clear-filters" class="button outline">Clear filters</button></div>`;
      $('#clear-filters')?.addEventListener('click', () => {
        query = '';
        active = 'All';
        $('#search').value = '';
        setFilterButtons();
        draw();
      });
      updateBadge();
    }
    function setFilterButtons() {
      $$('[data-filter]').forEach((b) => {
        b.classList.toggle('active', b.dataset.filter === active);
        b.setAttribute('aria-pressed', String(b.dataset.filter === active));
      });
    }
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      active = b.dataset.filter;
      setFilterButtons();
      draw();
    });
    $('#search').addEventListener('input', (e) => {
      query = e.target.value.toLowerCase().trim();
      draw();
    });
    $('#sort-options').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      sort = b.dataset.sort;
      $$('[data-sort]').forEach((el) => {
        el.classList.toggle('active', el === b);
        el.setAttribute('aria-pressed', String(el === b));
      });
      draw();
    });
    draw();
  }
  function summary(checkout = false) {
    const t = totals();
    return `<h2>Your order</h2>${
      checkout
        ? cart
            .map((i) => {
              const p = findProduct(i.id);
              return `<div class="summary-item"><img src="${p.image}" alt=""><span>${escape(p.name)}<small>Quantity ${i.quantity}</small></span><b>${money(i.quantity * p.price)}</b></div>`;
            })
            .join('')
        : ''
    }<dl><div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div><div><dt>Delivery</dt><dd>${money(t.deliveryFee)}</dd></div><div class="total"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl>${!checkout && cart.length ? '<a class="button full" href="/checkout.html">Continue to checkout <span aria-hidden="true">→</span></a>' : ''}<p class="fine-print">Cash on delivery · No card details needed<br>All prices in Sri Lankan rupees.</p>`;
  }
  function renderCart() {
    const target = $('#cart-items');
    if (!target) return;
    if (!cart.length) {
      target.innerHTML = empty(
        'Your bag is waiting.',
        'A fresh stem or a warm cup? Find your little something.'
      );
      $('#cart-summary').hidden = true;
      return;
    }
    $('#cart-summary').hidden = false;
    target.innerHTML = cart
      .map((i) => {
        const p = findProduct(i.id);
        return `<article class="cart-row"><img src="${p.image}" alt="${escape(p.name)}"><div><h3>${escape(p.name)}</h3><p>${money(p.price)} each</p>${quantityControl(i.id, i.quantity, 'cart')}<button class="remove-button" data-remove="${i.id}">Remove ${escape(p.name)}</button></div><span class="price">${money(p.price * i.quantity)}</span></article>`;
      })
      .join('');
    $('#cart-summary').innerHTML = summary();
  }
  function bindForm(form, handler) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.busy === '1') return;
      const button = $('button[type="submit"]', form),
        message = $('.form-message', form),
        original = button.innerHTML;
      if (!form.reportValidity()) return;
      form.dataset.busy = '1';
      button.disabled = true;
      button.textContent = 'Please wait…';
      message.textContent = '';
      message.classList.remove('success');
      try {
        await handler(Object.fromEntries(new FormData(form)), message);
      } catch (error) {
        message.textContent = error.message;
        message.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } finally {
        form.dataset.busy = '0';
        button.disabled = false;
        button.innerHTML = original;
      }
    });
  }
  function authPage(config) {
    const form = $('#auth-form');
    if (!form) return;
    if ($('#google-option')) $('#google-option').hidden = !config.google;
    if (new URLSearchParams(location.search).get('redirect') === 'checkout')
      $$('.auth-bottom a').forEach((a) => {
        if (a.pathname === '/signup.html' || a.pathname === '/login.html')
          a.search = '?redirect=checkout';
      });
    if (new URLSearchParams(location.search).has('error'))
      $('.form-message', form).textContent =
        'Google sign-in could not be completed. If you already have an email account, use your password. Otherwise, please try again.';
    if (page === 'forgot-password' && !config.passwordReset) {
      $('.form-message', form).textContent =
        'Password reset emails are not available yet. Please try again later.';
      $('button[type="submit"]', form).disabled = true;
      return;
    }
    const resetToken = new URLSearchParams(location.hash.slice(1)).get('token');
    if (page === 'reset-password') {
      history.replaceState(null, '', location.pathname);
      if (!resetToken) {
        $('.form-message', form).textContent =
          'Open the complete link from your reset email, or request a new one.';
        $('button[type="submit"]', form).disabled = true;
        return;
      }
    }
    bindForm(form, async (data, message) => {
      if (data.confirmPassword !== undefined && data.confirmPassword !== data.password)
        throw Error('The passwords do not match. Please check them.');
      const endpoint = {
        signup: 'register',
        login: 'login',
        'forgot-password': 'forgot-password',
        'reset-password': 'reset-password'
      }[page];
      if (page === 'reset-password') data.token = resetToken;
      const result = await api('/auth/' + endpoint, data);
      message.classList.add('success');
      if (['login', 'signup'].includes(page)) {
        message.textContent = 'You’re signed in. Taking you to your account…';
        const redirect = new URLSearchParams(location.search).get('redirect');
        location.assign(redirect === 'checkout' ? '/checkout.html' : '/profile.html');
      } else {
        message.textContent = result.message;
        form.reset();
        if (page === 'reset-password') {
          setTimeout(() => location.assign('/login.html'), 1800);
        }
      }
    });
  }
  async function checkout() {
    if (!cart.length) {
      $('#checkout-content').innerHTML = empty(
        'Your bag is empty.',
        'Add something lovely before checking out.'
      );
      $('#checkout-summary').hidden = true;
      return;
    }
    $('#checkout-summary').innerHTML = summary(true);
    if (!user) {
      $('#checkout-content').innerHTML = empty(
        'Make yourself at home.',
        'Sign in or create an account to place your order. Your bag will be waiting.',
        '/login.html?redirect=checkout',
        'Sign in to continue'
      );
      return;
    }
    $('#checkout-content').innerHTML =
      `<form id="checkout-form" class="panel checkout-form"><h2>01. Your details</h2><label>Account email<input type="email" value="${escape(user.email)}" readonly></label><div class="form-row"><label>Recipient name<input name="customerName" value="${escape(user.firstName + ' ' + user.lastName)}" required minlength="2" maxlength="120" autocomplete="name"></label><label>Phone number<input name="customerPhone" value="${escape(user.phone || '')}" type="tel" required placeholder="077 123 4567" maxlength="20" autocomplete="tel"></label></div><h2>02. Where to send it</h2><label>Street address<input name="line" required minlength="5" maxlength="200" autocomplete="street-address" placeholder="House number and street"></label><div class="form-row"><label>City<input name="city" required minlength="2" maxlength="80" autocomplete="address-level2"></label><label>Postal code<input name="postalCode" required pattern="[0-9]{5}" maxlength="5" inputmode="numeric" autocomplete="postal-code" placeholder="10100"></label></div><p class="fine-print">Delivery within Sri Lanka. Availability and delivery arrangements are confirmed after ordering.</p><label>Delivery or gift note <small>Optional</small><textarea name="note" rows="2" maxlength="500" placeholder="Anything we should know?"></textarea></label><h2>03. Payment</h2><label class="payment-choice"><input type="radio" name="paymentMethod" value="cod" checked><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span></label><label class="payment-choice disabled" aria-disabled="true"><input type="radio" name="paymentMethod" value="card" disabled><span><strong>Credit / debit card</strong><small>Online payments are not available yet.</small></span><b class="coming-soon">Coming soon</b></label><p class="form-message" role="status"></p><button class="button full" type="submit">Place order · ${money(totals().total)} <span aria-hidden="true">→</span></button><p class="fine-print">No money is collected online. Your order will appear in your account as Pending.</p></form>`;
    // Persist a retry key across a reload; the server returns the same order if delivery of its response failed.
    let requestKey;
    try {
      const pending = JSON.parse(sessionStorage.getItem('flore-order-attempt') || 'null');
      if (pending?.bag === JSON.stringify(cart)) requestKey = pending.key;
    } catch {}
    requestKey ||= crypto.randomUUID();
    try {
      sessionStorage.setItem(
        'flore-order-attempt',
        JSON.stringify({ key: requestKey, bag: JSON.stringify(cart) })
      );
    } catch {}
    bindForm($('#checkout-form'), async (data, message) => {
      const result = await api('/orders', {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        address: { line: data.line, city: data.city, postalCode: data.postalCode },
        note: data.note,
        paymentMethod: 'cod',
        products: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        requestKey
      });
      cart = [];
      saveCart();
      try {
        sessionStorage.removeItem('flore-order-attempt');
      } catch {}
      message.textContent = 'Order placed. Opening your order…';
      location.assign('/profile.html?order=' + encodeURIComponent(result._id));
    });
  }
  function orderCard(order) {
    const currency = order.currency || 'USD';
    const format = (value) =>
      new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(value);
    return `<article class="order-card"><div class="order-head"><div><h3>Order ${escape(order._id.slice(-6).toUpperCase())}</h3><p>${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><span class="status-pill">${escape(order.status)}</span></div><p class="order-total">${format(order.totalPrice)}</p><details><summary>View order details</summary><div class="order-details"><ul>${order.products.map((p) => `<li>${p.quantity} × ${escape(p.name || p.productId)}${p.unitPrice != null ? ' — ' + format(p.unitPrice) : ''}</li>`).join('')}</ul><p>${escape(order.customerName)}<br>${escape(order.customerPhone || '')}${order.address ? `<br>${escape(order.address.line)}, ${escape(order.address.city)} ${escape(order.address.postalCode)}` : ''}</p>${order.note ? `<p>Note: ${escape(order.note)}</p>` : ''}<p>${order.paymentMethod === 'cod' ? 'Cash on delivery · ' + escape(order.paymentStatus || 'Unpaid') : 'Previous order'}</p><small>Reference: ${escape(order._id)}</small></div></details></article>`;
  }
  async function profile() {
    const target = $('#profile-content');
    if (!user) {
      target.innerHTML = empty(
        'Your corner of Floré.',
        'Sign in to see your profile and orders.',
        '/login.html?redirect=profile',
        'Sign in'
      );
      return;
    }
    target.innerHTML = `<div id="order-success"></div><div class="account-grid"><div class="panel"><h2>Hello, ${escape(user.firstName)}.</h2><p class="fine-print">Member since ${new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p><form id="profile-form"><label>First name<input name="firstName" required maxlength="60" value="${escape(user.firstName)}" autocomplete="given-name"></label><label>Last name<input name="lastName" required maxlength="60" value="${escape(user.lastName)}" autocomplete="family-name"></label><label>Email<input type="email" value="${escape(user.email)}" readonly></label><label>Phone<input name="phone" type="tel" maxlength="25" value="${escape(user.phone || '')}" autocomplete="tel"></label><p class="form-message" role="status"></p><button type="submit" class="button full">Save changes</button></form><details><summary class="text-link">Change password</summary><form id="password-form"><label>Current password<input name="currentPassword" type="password" required autocomplete="current-password"></label><label>New password<input name="newPassword" type="password" required minlength="10" maxlength="72" autocomplete="new-password"></label><p class="form-message" role="status"></p><button class="button outline full" type="submit">Update password</button></form></details><button id="logout" class="button outline full">Sign out</button></div><div><div class="section-heading"><h2>Your orders.</h2></div><div id="order-list"><p class="loading">Finding your orders…</p></div></div></div>`;
    bindForm($('#profile-form'), async (data, message) => {
      const result = await api('/auth/me', data, 'PUT');
      user = result.user;
      message.classList.add('success');
      message.textContent = 'Your details have been saved.';
    });
    bindForm($('#password-form'), async (data, message) => {
      const result = await api('/auth/change-password', data, 'PUT');
      message.classList.add('success');
      message.textContent = result.message;
      $('#password-form').reset();
    });
    $('#logout').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await api('/auth/logout', {});
        cart = [];
        saveCart();
        location.assign('/login.html');
      } catch (error) {
        toast(error.message);
        e.target.disabled = false;
      }
    });
    try {
      const orders = await api('/orders');
      $('#order-list').innerHTML = orders.length
        ? orders.map(orderCard).join('')
        : empty('A lovely story starts here.', 'Your orders will appear here once you place one.');
      const id = new URLSearchParams(location.search).get('order');
      if (id && orders.some((o) => o._id === id))
        $('#order-success').innerHTML =
          '<div class="success-banner" role="status"><h2>Thank you. Your order is in.</h2><p>You’ll pay cash on delivery. Your order is Pending while we arrange the details.</p></div>';
    } catch (error) {
      $('#order-list').innerHTML = empty(
        'Orders couldn’t be loaded.',
        error.message,
        '/profile.html',
        'Try again'
      );
    }
  }
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.password-toggle');
    if (toggle) {
      const input = $('input', toggle.parentElement);
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
      toggle.setAttribute(
        'aria-label',
        input.type === 'password' ? 'Show password' : 'Hide password'
      );
    }
    const step = e.target.closest('[data-step]');
    if (step && catalog) {
      const control = step.closest('[data-quantity]'),
        id = control.dataset.quantity,
        isCart = control.dataset.context === 'cart',
        value = isCart ? cart.find((i) => i.id === id)?.quantity : quantities.get(id) || 1;
      const next = Math.max(1, Math.min(20, value + Number(step.dataset.step)));
      if (isCart) {
        cart.find((i) => i.id === id).quantity = next;
        saveCart();
        renderCart();
        const replacement = $(`[data-quantity="${id}"] [data-step="${step.dataset.step}"]`);
        replacement?.focus();
      } else {
        quantities.set(id, next);
        $('output', control).value = next;
        $('[data-step="-1"]', control).disabled = next === 1;
        $('[data-step="1"]', control).disabled = next === 20;
      }
    }
    const add = e.target.closest('[data-add]');
    if (add && catalog) {
      const id = add.dataset.add,
        n = quantities.get(id) || 1,
        existing = cart.find((i) => i.id === id);
      if ((existing?.quantity || 0) + n > 20) {
        toast('You can add up to 20 of each item. Adjust your bag to add more.');
        return;
      }
      if (existing) existing.quantity += n;
      else cart.push({ id, quantity: n });
      saveCart();
      toast(
        `${n} × ${findProduct(id).name} added. ${cart.find((i) => i.id === id).quantity} now in your bag.`
      );
    }
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      const name = findProduct(remove.dataset.remove).name;
      cart = cart.filter((i) => i.id !== remove.dataset.remove);
      saveCart();
      renderCart();
      toast(name + ' removed from your bag.');
    }
  });
  const menu = $('.menu-toggle'),
    navigation = $('#navigation');
  function closeMenu() {
    navigation.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }
  menu.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header')) closeMenu();
  });
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === page) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'flore-bag-v1' && catalog) {
      try {
        const next = JSON.parse(e.newValue || '[]');
        cart = Array.isArray(next)
          ? next.filter(
              (i) =>
                findProduct(i.id) &&
                Number.isInteger(i.quantity) &&
                i.quantity >= 1 &&
                i.quantity <= 20
            )
          : [];
        updateBadge();
        if (page === 'cart') renderCart();
        if (page === 'checkout') location.reload();
      } catch {}
    }
  });
  document.addEventListener(
    'error',
    (e) => {
      if (e.target.tagName === 'IMG' && !e.target.dataset.fallback) {
        e.target.dataset.fallback = '1';
        e.target.src = '/images/mark.svg';
        e.target.alt = 'Floré — image unavailable';
      }
    },
    true
  );
  async function init() {
    let config = { google: false, passwordReset: false };
    // The catalog remains browsable even if an account request is unavailable.
    const results = await Promise.allSettled([
      fetch('/catalog.json', { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw Error('The collection could not load. Please refresh.');
        return r.json();
      }),
      api('/auth/me'),
      api('/config')
    ]);
    if (results[0].status === 'fulfilled') {
      catalog = results[0].value;
      const seen = new Set();
      cart = cart.filter((i) => {
        if (
          !i ||
          typeof i.id !== 'string' ||
          seen.has(i.id) ||
          !findProduct(i.id)?.available ||
          !Number.isInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 20
        )
          return false;
        seen.add(i.id);
        return true;
      });
      saveCart();
      renderCatalog();
      if (page === 'cart') renderCart();
    } else {
      const grid = $('#product-grid') || $('#cart-items');
      if (grid)
        grid.innerHTML = empty(
          'A little pause.',
          results[0].reason.message,
          location.pathname,
          'Try again'
        );
    }
    if (results[1].status === 'fulfilled') {
      user = results[1].value.user;
      $('#account-link').textContent = 'My account';
      $('#account-link').href = '/profile.html';
    }
    if (results[2].status === 'fulfilled') config = results[2].value;
    authPage(config);
    if (page === 'checkout' && catalog) await checkout();
    if (page === 'profile') await profile();
    const requestForm = $('#request-form');
    if (page === 'garden' && requestForm) {
      const choose = (name) => {
        requestForm.elements.experience.value = name;
        $('#chosen-experience').textContent = 'Selected experience: ' + name;
        $$('[data-plan]').forEach((button) => {
          const selected = button.dataset.plan === name;
          button.setAttribute('aria-pressed', String(selected));
          button.closest('.experience-card').classList.toggle('is-selected', selected);
        });
      };
      choose(requestForm.elements.experience.value);
      $$('[data-plan]').forEach((button) => button.addEventListener('click', () => {
        choose(button.dataset.plan);
        $('#enquiry').focus();
      }));
      requestForm.addEventListener('reset', () => choose('General Admission'));
    }
    if (requestForm)
      bindForm(requestForm, async (data, message) => {
        if (page === 'garden') {
          data.description = 'Garden visit enquiry — ' + data.experience + ': ' + data.description;
          delete data.experience;
        }
        const result = await api('/custom-gift-request', data);
        message.classList.add('success');
        message.textContent = result.message;
        requestForm.reset();
      });
    // Animate only content entering the viewport; reduced-motion users see static content.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal');
              observer.unobserve(entry.target);
            }
          }),
        { threshold: 0.1 }
      );
      $$('.collection,.story,.garden-feature').forEach((el) => observer.observe(el));
    }
  }
  init().catch((error) => toast(error.message));
})();
