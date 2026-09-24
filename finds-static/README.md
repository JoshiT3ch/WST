# Finds — static student prototype

## Open the website

Double-click `index.html` or open it in a modern browser. No installation, build step, account, or internet connection is required. You can also open this folder with VS Code and use Live Server.

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
- Active navigation, mobile menu, keyboard focus indicators, and skip link.
- Sample category filters, temporary favorite toggles, and item-detail dialogs.
- Keyboard-accessible FAQ accordion with one answer open at a time.
- Contact form with required fields, email and text validation, demo success, and reset.
- Responsive layouts and reduced-motion support.

All listings, conditions, and prices are fictional samples. Favorites live only in the current page and reset on navigation or refresh. The contact form sends no requests and stores nothing. The submit button is enabled only when JavaScript has installed its local handler. There is no authentication, payment, seller chat, database, analytics, or backend.

## Edit the project

Change page content in the HTML files. The navbar and footer are intentionally repeated so each page remains understandable and works as a standalone file; update all five when changing shared links. Edit colors, spacing, and breakpoints in `css/style.css`. Edit interactions and sample detail data in `js/main.js`. Product cards live in `index.html`; keep their `data-product` values matched to the JavaScript data.

Replace illustrations under `images/products/` with your own photos, and update the HTML and JavaScript image paths and alternative text. SVG artwork is original placeholder artwork created for this prototype. No external fonts, image services, frameworks, or libraries are required.

## Add a backend later

1. Replace the sample product object and static cards with listings returned by an API.
2. Add authentication before account-specific favorites or seller tools.
3. Connect the contact form to a server endpoint and add server-side validation.
4. Only show a real success message after that server confirms delivery.

The existing Finds website at https://finds-brown.vercel.app/ inspired the sage palette, second-hand fashion direction, and bold typography. This is a new static implementation, not a copy of its application code.
