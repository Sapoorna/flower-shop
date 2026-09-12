# Floré - Café & Botanicals

A mobile-friendly website for flowers, café favourites, gifts and garden experiences. Built with HTML, CSS, JavaScript, Node.js, Express and MongoDB.

## Features

- Product photos, search, filters and quantity controls.
- Shopping bag and cash-on-delivery checkout in LKR.
- Signup, password login, profiles and order history.
- Three garden experience cards and custom enquiries.
- Card payments displayed but disabled.

## Run locally

Install Node.js 22 or newer. Create `backend/.env` using `backend/.env.example`, then enter your MongoDB connection and a private JWT secret. For local use, set `NODE_ENV=development`, `PORT=5000` and `FRONTEND_URL=http://localhost:5000`.

From the project folder:

```sh
cd backend
npm ci
npm start
```

On Windows, use `npm.cmd` instead of `npm` if PowerShell reports an npm error. Open http://localhost:5000 and keep the terminal open. Press Ctrl+C to stop.

## Project files

- `backend/public/` — pages, images and fonts.
- `backend/public/css/store.css` — shared styling.
- `backend/public/js/store.js` — shared browser behaviour.
- `backend/public/catalog.json` — products, LKR prices and delivery fee.
- `backend/routes/` and `backend/models/` — API and database logic.
