# Finds — website frontend

## Open the website

From the project root (one folder above this one), run `npm install` and `npm start`, then open [http://localhost:3000](http://localhost:3000). The Node.js server provides the product and contact APIs. Opening the HTML files directly or through Live Server does not provide these APIs. See the [project README](../README.md) for configuration and API details.

## Files

```text
finds-static/
├── index.html
├── how-it-works.html
├── about.html
├── contact.html
├── faqs.html
├── css/style.css
├── js/main.js
├── images/
│   ├── logo/mark.svg
│   ├── hero/sparkle.svg
│   └── products/ (four original SVG illustrations)
└── README.md
```

## What works

- Five linked pages with the same navigation and footer.
- Shared Finds search header, category menus that open on desktop hover, mobile category toggle, keyboard focus indicators, and skip link.
- API-backed listing search with Woman/Men/Kids filtering, loading, error, retry, and empty-results states. The menus browse the current four-item sample collection.
- Temporary favorite toggles and API-backed item-detail dialogs.
- Keyboard-accessible FAQ accordion with one answer open at a time.
- Contact form with client and server validation, persistent message storage, error feedback, and reset after confirmed saving.
- Responsive layouts and reduced-motion support.

All listings, conditions, and prices are fictional samples. Favorites live only in the current page and reset on navigation or refresh. The contact form sends details to `/api/contact` and the Node.js backend saves them in `.data/messages.jsonl`, outside this public folder. The submit button is enabled only when JavaScript has installed its handler. Authentication, payment, seller chat, and email delivery are not implemented.

## Edit the project

Change page content in the HTML files. The header, category menus, and footer are intentionally repeated; update all five when changing shared links. Category links use `index.html?q=search-term#featured` to search the current listings. Edit colors, spacing, and breakpoints in `css/style.css`, and interactions in `js/main.js`. Edit product data in `../server/data/products.json`; this is the source for rendered listings and details. The first product card in `index.html` supplies the HTML template for API-loaded cards. The other static cards are a preview when JavaScript is unavailable.

Replace illustrations under `images/products/` with your own photos, and update the product JSON and any static HTML image paths. SVG artwork is original placeholder artwork created for this prototype. Frontend assets are served locally.

## Backend files

The project root contains `server/app.js` (Express routes and static hosting), `server/index.js` (startup), `server/message-store.js` (serialized local message writes), `server/data/products.json` (sample catalogue), and `test/api.test.js` (integration tests). Run `npm test` from the project root.

The existing Finds website at https://finds-brown.vercel.app/ inspired the sage palette, second-hand fashion direction, and bold typography. This is a new implementation, not a copy of its application code.
