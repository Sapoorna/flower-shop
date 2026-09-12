const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-secret-at-least-32-characters';
process.env.FRONTEND_URL = 'http://localhost:5000';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.BREVO_API_KEY = '';
process.env.MAIL_FROM = '';
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../.cache/mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User'),
  Order = require('../models/Order');
let mongo;
before(
  async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([User.init(), Order.init()]);
  },
  { timeout: 240000 }
);
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
const write = (agent, path, data, method = 'post') =>
  agent[method](path)
    .set('Content-Type', 'application/json')
    .set('X-Flore-Request', '1')
    .set('Origin', 'http://localhost:5000')
    .send(data);
test('Account, COD ordering and reset security', async (t) => {
  const alice = request.agent(app),
    bob = request.agent(app);
  let firstCookie, order;
  await t.test('register normalizes email, hashes password and uses HttpOnly cookie', async () => {
    const res = await write(alice, '/api/auth/register', {
      firstName: 'Alice',
      lastName: 'Tester',
      email: 'Alice@Example.com',
      password: 'long test password'
    }).expect(201);
    assert.equal(res.body.user.email, 'alice@example.com');
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.user.password, undefined);
    firstCookie = res.headers['set-cookie'][0];
    assert.match(firstCookie, /HttpOnly/);
    assert.match(firstCookie, /SameSite=Lax/);
    const record = await User.findOne({ email: 'alice@example.com' }).select('+password');
    assert.notEqual(record.password, 'long test password');
    assert.equal(await record.comparePassword('long test password'), true);
    await alice.get('/api/auth/me').expect(200);
  });
  await t.test('duplicate and malformed registration rejected', async () => {
    await write(alice, '/api/auth/register', {
      firstName: 'Alice',
      lastName: 'Tester',
      email: 'alice@example.com',
      password: 'another long password'
    }).expect(409);
    await write(alice, '/api/auth/register', {
      firstName: 'A',
      lastName: 'T',
      email: { $ne: null },
      password: 'long test password'
    }).expect(400);
    await write(alice, '/api/auth/register', {
      firstName: 'A',
      lastName: 'T',
      email: 'a@b.com',
      password: 'short'
    }).expect(400);
  });
  await t.test('same-site write protection rejects foreign requests and simple forms', async () => {
    await request(app)
      .post('/api/auth/register')
      .set('Origin', 'https://evil.example')
      .set('X-Flore-Request', '1')
      .send({})
      .expect(403);
    await request(app)
      .post('/api/auth/register')
      .type('form')
      .send({ email: 'a@b.com' })
      .expect(403);
  });
  await t.test('sign-in rejects wrong password and accepts correct credentials', async () => {
    await write(bob, '/api/auth/login', {
      email: 'alice@example.com',
      password: 'wrong password'
    }).expect(401);
    await write(alice, '/api/auth/login', {
      email: 'alice@example.com',
      password: 'long test password'
    }).expect(200);
  });
  const payload = {
    products: [{ productId: 'blush-roses', quantity: 2 }],
    totalPrice: 1,
    paymentMethod: 'cod',
    requestKey: 'unique-test-order-1234',
    customerName: 'Alice Tester',
    customerPhone: '0771234567',
    address: { line: '12 Test Street', city: 'Colombo', postalCode: '10100' }
  };
  await t.test('server computes total, saves address and ignores submitted prices', async () => {
    const res = await write(alice, '/api/orders', payload).expect(201);
    order = res.body;
    assert.equal(order.totalPrice, 13350);
    assert.equal(order.currency, 'LKR');
    assert.equal(order.address.city, 'Colombo');
    assert.equal(order.paymentMethod, 'cod');
    assert.equal(order.products[0].unitPrice, 6500);
  });
  await t.test('order retries are idempotent', async () => {
    const res = await write(alice, '/api/orders', payload).expect(200);
    assert.equal(res.body._id, order._id);
    assert.equal(await Order.countDocuments(), 1);
  });
  await t.test('card payments and invalid items cannot bypass the UI', async () => {
    for (const change of [
      { paymentMethod: 'card' },
      { products: [{ productId: 'not-real', quantity: 1 }] },
      { products: [{ productId: 'blush-roses', quantity: -1 }] },
      { products: [{ productId: 'blush-roses', quantity: 1.5 }] },
      { products: [{ productId: 'blush-roses', quantity: 21 }] },
      {
        products: [
          { productId: 'blush-roses', quantity: 1 },
          { productId: 'blush-roses', quantity: 2 }
        ]
      }
    ])
      await write(alice, '/api/orders', {
        ...payload,
        requestKey: crypto.randomUUID(),
        ...change
      }).expect(400);
  });
  await t.test('anonymous and other users cannot access Alice orders', async () => {
    await request(app).get('/api/orders').expect(401);
    await write(bob, '/api/auth/register', {
      firstName: 'Bob',
      lastName: 'Tester',
      email: 'bob@example.com',
      password: 'another long password'
    }).expect(201);
    const res = await bob.get('/api/orders').expect(200);
    assert.equal(res.body.length, 0);
    await write(bob, '/api/products', { name: 'Injected' }).expect(404);
  });
  await t.test('profile clears phone and never updates role/email from extra fields', async () => {
    const res = await write(
      alice,
      '/api/auth/me',
      {
        firstName: 'Alice',
        lastName: 'Tester',
        phone: '',
        role: 'admin',
        email: 'hijack@example.com'
      },
      'put'
    ).expect(200);
    assert.equal(res.body.user.phone, '');
    assert.equal(res.body.user.email, 'alice@example.com');
    assert.equal((await User.findOne({ email: 'alice@example.com' })).role, 'user');
  });
  await t.test('custom gift requests are persisted and validated', async () => {
    await write(alice, '/api/custom-gift-request', {
      name: 'Alice',
      email: 'alice@example.com',
      description: 'A birthday bouquet with white flowers.'
    }).expect(201);
    assert.equal(await require('../models/customGift').countDocuments(), 1);
    await write(alice, '/api/custom-gift-request', {
      name: 'Alice',
      email: 'bad',
      description: 'A birthday bouquet'
    }).expect(400);
  });
  await t.test('reset without configured mail does not pretend to send', async () => {
    await write(alice, '/api/auth/forgot-password', { email: 'alice@example.com' }).expect(503);
  });
  await t.test(
    'reset link is single-use, stores a hash and revokes existing sessions',
    async () => {
      process.env.BREVO_API_KEY = 'test-only';
      process.env.MAIL_FROM = 'test@example.com';
      const originalFetch = global.fetch;
      let token;
      global.fetch = async (url, options) => {
        assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
        token = JSON.parse(options.body).textContent.match(/token=([a-f0-9]+)/)[1];
        return { ok: true };
      };
      try {
        await write(alice, '/api/auth/forgot-password', { email: 'alice@example.com' }).expect(200);
      } finally {
        global.fetch = originalFetch;
      }
      const record = await User.findOne({ email: 'alice@example.com' }).select('+resetHash');
      assert.notEqual(record.resetHash, token);
      await write(request(app), '/api/auth/reset-password', {
        token,
        password: 'new long test password'
      }).expect(200);
      await write(request(app), '/api/auth/reset-password', {
        token,
        password: 'another long password'
      }).expect(400);
      await alice.get('/api/auth/me').expect(401);
      await write(alice, '/api/auth/login', {
        email: 'alice@example.com',
        password: 'new long test password'
      }).expect(200);
    }
  );
  await t.test('expired reset links are rejected', async () => {
    const token = 'a'.repeat(64);
    await User.updateOne(
      { email: 'alice@example.com' },
      {
        $set: {
          resetHash: require('../lib/security').hash(token),
          resetExpires: new Date(Date.now() - 1000)
        }
      }
    );
    await write(request(app), '/api/auth/reset-password', {
      token,
      password: 'another long password'
    }).expect(400);
  });
  await t.test('production session cookies are Secure and HTTP-only', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const options = require('../lib/security').cookieOptions();
      assert.equal(options.secure, true);
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, 'lax');
    } finally {
      process.env.NODE_ENV = original;
    }
  });
  await t.test('logout revokes captured session', async () => {
    const login = await write(alice, '/api/auth/login', {
      email: 'alice@example.com',
      password: 'new long test password'
    }).expect(200);
    firstCookie = login.headers['set-cookie'][0];
    await write(alice, '/api/auth/logout', {}).expect(200);
    await alice.get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', firstCookie.split(';')[0]).expect(401);
  });
  await t.test('CSP blocks inline scripts and external assets', async () => {
    const res = await request(app).get('/shop.html').expect(200);
    assert.match(res.headers['content-security-policy'], /script-src 'self'/);
    assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline/);
  });
});
