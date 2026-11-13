# Finds frontend

The public website contains six HTML pages, shared CSS, images, and a generated React bundle. Express serves this folder and the API from the same origin. See the [project README](../README.md) for setup, configuration, API contracts, testing, and limitations.

## Run locally

From the repository root, one directory above this folder:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Refresh the browser after frontend changes. `npm start` builds a minified bundle and starts the server without watching.

Opening HTML files directly or through Live Server does not provide the product, listing, or contact APIs.

## Pages and assets

```text
finds-static/
├── index.html           # Home and catalogue
├── sell.html            # Listing form
├── how-it-works.html
├── about.html
├── contact.html
├── faqs.html
├── css/style.css
├── images/              # Logo, product illustrations, and page images
├── js/app.js            # Generated; ignored by Git
└── uploads/             # Public item photos; ignored by Git
```

## Where to make changes

| Concern | Source |
| --- | --- |
| Page copy and layout markup | The corresponding HTML file in this folder. |
| Styling and responsive behavior | `css/style.css`. |
| Header search and mobile navigation | `../frontend/Header.jsx`. |
| Filters, cards, favorites, and details | `../frontend/Catalogue.jsx`. |
| Listing form and photo preview | `../frontend/SellForm.jsx`. |
| Contact submission | `../frontend/ContactForm.jsx`. |
| React mounting and search coordination | `../frontend/main.jsx`. |
| API calls and error handling | `../frontend/api.js`. |
| Shared listing validation | `../shared/listing-validation.js`. |
| Seeded product data | `../server/data/products.json`. |

Edit React source rather than `js/app.js`; esbuild generates that bundle. The active header is rendered by React; its HTML markup is a fallback. Category menus and footers remain repeated across all six HTML pages, so update every page when changing shared links.

## Interaction rules

- Catalogue requests combine `q`, `audience`, and `category`. Selected filters are reflected in the page URL.
- Header audience links use values such as `index.html?audience=Woman#featured`; subcategory search links add `q` alongside the audience.
- Items assigned to multiple audiences appear in each matching filter. The jacket sample is assigned to Men, sneakers to Woman, and the tee and tote to both.
- Product images, names, and quick-view buttons open the same detail dialog. Closing it restores focus to the opening control.
- Favorites last for the current page visit and reset after refresh or navigation.
- “Sell Now” and “List an Item” open `sell.html`. Listings require item details, at least one explicitly selected audience, and one photo.
- Item names allow letters and spaces, including accented letters; numbers and punctuation are rejected. Errors appear beside the relevant fields.
- Photo previews use a temporary object URL. Saved photos are served from `/uploads/`; the API returns relative image paths with listings.
- Contact success confirms a saved message; no email is sent.

## Backend boundary

Express serves the seeded catalogue plus records from the configured data directory. Runtime listings and contact messages are stored separately as JSONL files. Only uploaded item photos belong in the public `uploads/` folder; private records must remain outside this directory.

Run `npm run check` and `npm test` from the repository root. Check changed browser interactions as well, especially validation, filtering, navigation, and keyboard behavior.

## Design reference

The sage palette, second-hand fashion direction, and bold typography were inspired by the [Finds reference site](https://finds-brown.vercel.app/). The SVG illustrations are original placeholder artwork created for this prototype.
