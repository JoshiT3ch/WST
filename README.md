# Finds

Finds is a student website prototype for discovering pre-loved fashion. Its goal is to give clothes and accessories a second chance by making it easy to explore sample finds, learn how the concept works, and get to know the people and purpose behind it.

## Website flow

1. **[Home](finds-static/index.html)** introduces Finds and lets visitors browse a sample collection, filter items by category, and preview product details.
2. **[How it Works](finds-static/how-it-works.html)** explains the idea and the steps behind finding pre-loved items.
3. **[About Us](finds-static/about.html)** shares the story and purpose of Finds.
4. **[Contact](finds-static/contact.html)** lets visitors send a message to the Finds backend.
5. **[FAQs](finds-static/faqs.html)** answers common questions. Visitors can reach any page from the shared navigation and return to Home at any time.
6. **[Sell Now](finds-static/sell.html)** provides a listing form where visitors can enter an item's name, category, price, size, condition, intended audience, and description, then select an item photo. Required fields are validated before submission. The form is part of the Finds listing prototype.

## Team responsibilities

| Page | Team member |
| --- | --- |
| Landing Page (Home Page) | Joshi |
| How it Works | Jose |
| About Us Page | Ashley |
| Contact Page | Irene |
| FAQ Page | Abdul |

## Run locally

Install Node.js 22.9 or newer (Node.js 24 is installed on this computer), then run these commands from the project root:

```sh
npm install
npm start
```

Open [Finds locally](http://localhost:3000). `npm start` builds the React frontend before starting the server. Use `npm run dev` to rebuild React components and restart the backend automatically when their source files change; refresh the browser to see frontend changes. Stop the server with Ctrl+C. Open the site through Node.js, since double-clicking HTML files or using Live Server does not provide the API.

React components control the header search, mobile menu, Woman/Men/Kids filters, save buttons, product details, and contact form. The Node.js/Express backend serves the website pages and their APIs. Listings come from `server/data/products.json`. Contact messages are saved in `.data/messages.jsonl`, outside the public website and excluded from Git. Messages survive server restarts. There is no public endpoint to read messages; review the local file as the project owner.

The Sell Now page provides a form for submitting item details. It includes fields for the item name, category, price in PHP, size, condition, intended audience, description, and item photo selection. The form requires the marked fields and at least one audience selection. The photo field is available in the interface, but image upload and storage have not been verified.

React source lives in `frontend/`. `npm run build` bundles it with esbuild into `finds-static/js/app.js`; this generated file is ignored by Git. Install development dependencies when building (plain `npm install` includes them). HTML page content and CSS remain in `finds-static/`.

Optional configuration: copy `.env.example` to `.env` and change `PORT`, `HOST`, or `DATA_DIR`. The defaults work without an environment file. Keep `DATA_DIR` outside `finds-static`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check whether the server is running |
| GET | `/api/products` | List sample products |
| GET | `/api/products?q=denim&audience=Men` | Search and filter products |
| GET | `/api/products/jacket` | Read one product's details |
| POST | `/api/contact` | Validate and save a message |

Product list responses contain `{ products, total }`; detail responses contain `{ product }`. `q` is limited to 100 characters. `audience` accepts `All`, `Woman`, `Men`, or `Kids`; the current catalogue has no Kids items.

Contact requests use JSON fields `name` (1–80 characters), `email` (valid address, up to 120 characters), `topic` (`buying`, `selling`, `listing`, `account`, `feedback`, `general`, or `other`), and `message` (10–2000 characters). Success returns HTTP 201 with an ID and timestamp. Messages are limited to five submissions per IP per 15 minutes. Errors return `{ error }`; submissions do not send email.

## Checks and current scope

Run `npm run check` for server syntax checks and a production React build. `npm test` builds React and runs API integration tests, including checking that the browser bundle is served. Tests use temporary storage and cover filtering, validation, persistence, concurrent writes, rate limiting, storage failures, and keeping backend files private.

The backend is intended for local, single-process development with a writable disk. JSON storage and in-memory request limits need replacing with a shared database and shared limits before running multiple instances or deploying on a host with temporary storage. The server binds to `127.0.0.1` by default. The Sell Now form is a listing-submission prototype. Seller accounts, image upload and storage, checkout, payments, seller chat, and email delivery are not yet confirmed as implemented. Favorites remain temporary. More frontend details are in the [website README](finds-static/README.md). 
