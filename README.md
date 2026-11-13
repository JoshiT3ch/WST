# Finds

**Good clothes. Great finds. New stories.**

Finds is a pre-loved fashion marketplace prototype that helps people discover second-hand pieces and give their own items another chapter. Visitors can browse a catalogue, combine search and filters, inspect item details, and publish a listing with a photo.

Built as a student web systems project, Finds currently runs as a local MVP with a React interface, an Express API, and persistent file storage. Listing creation and contact submissions are implemented. Seller accounts, checkout, and payments are future work.

[Quick start](#quick-start) · [Configuration](#configuration) · [Project structure](#project-structure) · [API reference](#api-reference) · [Testing](#testing) · [Troubleshooting](#troubleshooting)

## Features

| Area | Current behavior |
| --- | --- |
| Catalogue | Browse seeded items alongside listings created through the website. |
| Search | Search titles, categories, descriptions, sizes, conditions, and audiences. Matching is case-insensitive, and all search terms must match. |
| Filters | Combine audience and product category with search. Filter selections are stored in the page URL and restored after reload. |
| Item details | Select an item image, name, or “Take a closer look” to open its details. Closing the dialog restores keyboard focus. |
| Sell Now | Submit item details and one photo, preview the photo, and receive confirmation after the listing is saved. |
| Validation | Shared client/server listing rules, field-specific feedback, and explicit audience selection. |
| Favorites | Save or unsave items for the current page visit. Favorites reset on refresh or navigation. |
| Contact | Submit a validated message that is stored privately on the server. |
| Interface | Six linked pages, mobile navigation, responsive layouts, loading/error states, retry controls, and an FAQ accordion. |

## Quick start

### Requirements

- **Node.js 22.9.0 or newer**, as declared in `package.json`.
- **npm**, included with Node.js.
- **Git** to clone the repository.
- A writable local folder for saved listings, contact messages, and photos.

Check your tools:

```sh
node --version
npm --version
git --version
```

### Install and run

```sh
git clone https://github.com/JoshiT3ch/WST.git
cd WST
npm ci
npm start
```

`npm ci` installs the dependencies recorded in `package-lock.json`. Include development dependencies: esbuild is needed to build the frontend, so do not use `--omit=dev` for this setup.

`npm start` builds React and starts Express. The terminal prints:

```text
Finds is running at http://127.0.0.1:3000
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Stop the server with **Ctrl+C** in its terminal.

Serve the site through this Node.js process. Opening HTML files directly or using VS Code Live Server does not provide the Finds API.

### Development mode

```sh
npm run dev
```

This watches frontend source files and rebuilds the bundle. Node's watch mode restarts the backend when its imported source files change. **Refresh the browser** to see frontend updates; the project does not automatically reload the page.

### Check server health

Open [the health endpoint](http://127.0.0.1:3000/api/health), or run this in PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

The endpoint returns HTTP `200` with `{ "status": "ok" }`.

## Configuration

Defaults work without an `.env` file. To customize them, copy the example from the project root:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```sh
# Git Bash, macOS, or Linux
cp .env.example .env
```

Edit `.env`, then restart the npm process:

```dotenv
HOST=127.0.0.1
PORT=3000
DATA_DIR=.data
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Address the server binds to. The default makes it accessible on the local machine. |
| `PORT` | `3000` | HTTP port; must be an integer from `1` through `65535`. |
| `DATA_DIR` | `.data` | Directory for contact and listing records. Relative paths are resolved from the project root; absolute paths are also supported. |

`DATA_DIR` must be **outside `finds-static/`**. The server rejects a data directory inside the public site. This variable changes the JSON record location; photos still go to `finds-static/uploads/`.

The root `.env` file and default `.data/` directory are ignored by Git. If you choose a different data directory inside the repository, add that location to `.gitignore` before saving real submissions there.

## Available commands

Run commands from the repository root, beside `package.json`.

| Command | What it does |
| --- | --- |
| `npm ci` | Installs locked dependencies for a fresh checkout. |
| `npm run dev` | Watches and rebuilds React, and runs the backend in watch mode. |
| `npm start` | Builds the frontend through `prestart`, then starts the HTTP server. |
| `npm run build` | Produces the minified bundle at `finds-static/js/app.js`. Does not start the server. |
| `npm run check` | Checks server/startup/development-script syntax and builds the frontend. |
| `npm test` | Builds React through `pretest`, then runs the Node.js integration tests. |

Edit source files rather than the generated bundle. Bundles, source maps, dependencies, and uploaded photos are excluded from Git.

## Website pages

| Page | Local route | Purpose |
| --- | --- | --- |
| Home | `/` or `/index.html` | Discover items, search, filter, save favorites, and open details. |
| Sell Now | `/sell.html` | Create a listing with item details and one photo. |
| How It Works | `/how-it-works.html` | Understand the Finds concept and browsing/listing flow. |
| About Us | `/about.html` | Learn about the project, its purpose, and its team. |
| Contact | `/contact.html` | Send a message through the local backend. |
| FAQs | `/faqs.html` | Browse frequently asked questions. |

All “Sell Now” and “List an Item” links lead to `/sell.html`.

### Sample catalogue and audiences

The four seeded products are fictional demonstrations:

| Item | Category | Audience |
| --- | --- | --- |
| Vintage denim jacket | Clothing | Men |
| The everyday tee | Clothing | Woman, Men |
| Everywhere canvas tote | Accessories | Woman, Men |
| Weekend sneakers | Shoes | Woman |

Items assigned to multiple audiences appear in each matching filter. The seeded catalogue has no Kids items; new listings can be assigned to Kids. A valid filter combination can return no results.

The navigation label “Women” uses the API value `Woman`. API audience and category values are case-sensitive.

## Project structure

Finds uses static HTML pages with React components mounted into the shared header, catalogue, contact form, and listing form. esbuild bundles those components. Express serves both the website and API from the same origin.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Pages and styling | HTML, CSS, SVG | Content, layout, responsive styles, and sample illustrations. |
| Interactive UI | React 19, React DOM | Search, filters, dialogs, favorites, menus, and form state. |
| Build tooling | esbuild | Bundling, minification, and development watching. |
| HTTP backend | Node.js, Express 5 | Static hosting, API routes, validation, and persistence. |
| Request handling | Multer, Helmet, express-rate-limit | Multipart uploads, security headers, and submission limits. |
| Persistence and tests | JSON/JSONL, Node.js test runner | Local records and API integration checks. |

```text
WST/
├── frontend/
│   ├── main.jsx                 # React entry point and page mounting
│   ├── Header.jsx               # Search and navigation controls
│   ├── Catalogue.jsx            # Filters, cards, favorites, and detail dialog
│   ├── SellForm.jsx             # Listing form and photo preview
│   ├── ContactForm.jsx          # Contact submission and confirmation
│   ├── api.js                   # Fetch helper, errors, and price formatting
│   └── ui.jsx                   # Shared icon components
├── finds-static/
│   ├── index.html               # Home; other page HTML files are alongside it
│   ├── sell.html
│   ├── css/style.css
│   ├── images/                  # Logos, artwork, and page images
│   ├── js/app.js                # Generated bundle; ignored by Git
│   └── uploads/                 # Public item photos; ignored by Git
├── server/
│   ├── index.js                 # Server startup and shutdown
│   ├── app.js                   # Routes, middleware, and static hosting
│   ├── message-store.js         # Serialized contact-message writes
│   ├── product-store.js         # Listing reads and serialized writes
│   └── data/products.json       # Tracked sample catalogue
├── shared/listing-validation.js # Rules shared by UI and API
├── scripts/dev.js               # Frontend watcher and backend process
├── test/api.test.js             # Integration tests
├── .data/                      # Runtime JSONL records; ignored by Git
├── .env.example                # Optional configuration template
├── package.json
└── package-lock.json
```

### Storage and persistence

| Data | Default location | Behavior |
| --- | --- | --- |
| Seeded products | `server/data/products.json` | Tracked in Git and loaded when the server starts. |
| Created listings | `.data/products.jsonl` | One JSON record per line; read alongside seeded products. |
| Contact messages | `.data/messages.jsonl` | Private records; no public message-reading endpoint. |
| Item photos | `finds-static/uploads/` | Generated filenames; served publicly at `/uploads/<filename>`. |

Runtime directories and files are created as needed. Listings and contact records receive a generated UUID and creation timestamp. Data survives restarts as long as the files remain on disk. Back up both the record directory and uploaded photos together to retain listings and their images.

## API reference

**Local base URL:** `http://127.0.0.1:3000`

API responses are JSON and use `Cache-Control: no-store`. The current prototype has no account authentication. Both submission routes have separate limits of **five requests per IP per 15 minutes**; rejected submissions also count toward the limits.

| Method | Endpoint | Successful response |
| --- | --- | --- |
| `GET` | `/api/health` | `200` — `{ "status": "ok" }` |
| `GET` | `/api/products` | `200` — `{ "products": [...], "total": 4 }`; total varies with filters and saved listings. |
| `GET` | `/api/products/:id` | `200` — `{ "product": {...} }` |
| `POST` | `/api/products` | `201` — `{ "product": {...}, "message": "Your listing has been created." }` |
| `POST` | `/api/contact` | `201` — `{ "id": "...", "message": "Your message has been received.", "createdAt": "..." }` |

### Search and filter products

| Query parameter | Default | Accepted values |
| --- | --- | --- |
| `q` | Empty | Up to 100 characters; whitespace-separated terms must all match the searchable item text. |
| `audience` | `All` | `All`, `Woman`, `Men`, `Kids`. |
| `category` | `All` | `All`, `Clothing`, `Shoes`, `Accessories`, `Bags`, `Home`, `Kids`, `Other`. |

Example:

```text
GET /api/products?q=denim&audience=Men&category=Clothing
```

Results include matching seeded and submitted listings. `total` is the number of matches. There is no pagination or sorting parameter. Unknown filter values, repeated search/filter parameters, or an overlong search return `400`. A valid query with no matches returns `{ "products": [], "total": 0 }`.

A product includes `id`, `title`, `description`, `category`, `audiences`, `price`, `currency`, `size`, `condition`, and a relative `image` URL. Submitted listings also include `createdAt`. Prices use PHP. Unknown product IDs return `404` with `{ "error": "Find not found." }`.

### Create a listing

Send `multipart/form-data` to `POST /api/products`. JSON listing submissions are rejected. Let the browser or HTTP client generate the multipart boundary.

| Field | Required | Validation |
| --- | --- | --- |
| `title` | Yes | 1–100 characters after trimming; letters and spaces only, including accented letters. Numbers and punctuation are rejected. |
| `description` | Yes | 10–1,000 characters after trimming. |
| `category` | Yes | `Clothing`, `Shoes`, `Accessories`, `Bags`, `Home`, `Kids`, or `Other`. |
| `price` | Yes | Whole-number PHP amount from `1` to `10000000`. |
| `size` | Yes | 1–40 characters after trimming. |
| `condition` | Yes | `New`, `Like new`, `Good`, or `Fair`. |
| `audiences` | Yes | One or more unique values from `Woman`, `Men`, `Kids`. Repeat the field to select multiple audiences. |
| `image` | Yes | One JPEG, PNG, or WebP file, up to 5,242,880 bytes (5 MiB). |

For example, `Linen summer shirt` is a valid name; `Shirt 123!` is rejected. The photo handler checks the declared MIME type and basic file signatures before saving the upload.

Example using Bash syntax in Git Bash, macOS, or Linux; replace `./item.png` with your photo:

```sh
curl http://127.0.0.1:3000/api/products \
  -F 'title=Linen summer shirt' \
  -F 'description=A lightweight shirt in good condition.' \
  -F 'category=Clothing' \
  -F 'price=425' \
  -F 'size=Medium' \
  -F 'condition=Like new' \
  -F 'audiences=Woman' \
  -F 'audiences=Men' \
  -F 'image=@./item.png;type=image/png'
```

This creates a local listing and counts toward the submission limit. The Sell Now page provides the equivalent browser workflow.

Field-validation failures return `400`, for example:

```json
{
  "error": "Check the highlighted fields before listing your item on Finds.",
  "fieldErrors": {
    "title": "Use letters and spaces only for the item name; numbers and symbols are not allowed."
  }
}
```

### Send a contact message

Send JSON with `Content-Type: application/json` to `POST /api/contact`.

| Field | Required | Validation |
| --- | --- | --- |
| `name` | Yes | 1–80 characters after trimming. |
| `email` | Yes | Valid email format, up to 120 characters. |
| `topic` | Yes | `buying`, `selling`, `listing`, `account`, `feedback`, `general`, or `other`. |
| `message` | Yes | 10–2,000 characters after trimming. |

Example body:

```json
{
  "name": "Alex Santos",
  "email": "alex@example.com",
  "topic": "general",
  "message": "How can I list an item on Finds?"
}
```

A success response confirms that the record was saved. It does **not** send an email. The JSON request-body limit is 16 KB.

### Errors and request rules

Most API failures return `{ "error": "Human-readable message" }`. Listing field-validation errors also include `fieldErrors`. If a submission includes an `Origin` header, its host must match the request's `Host` header.

| Status | Meaning |
| --- | --- |
| `400` | Invalid fields, malformed JSON, unsupported filter values, or an invalid image. |
| `403` | Submission origin does not match the website host. |
| `404` | Product or API route does not exist. |
| `413` | Uploaded photo or JSON body exceeds its size limit. |
| `415` | Wrong format: listings require multipart data; contact requires JSON. |
| `429` | Submission rate limit reached; try again after the 15-minute window. |
| `500` | Server or storage failure; the client receives a generic error. |

## Testing

Before submitting a code change:

```sh
npm run check
npm test
```

The integration suite in `test/api.test.js` covers:

- Website pages, assets, the generated bundle, and health responses.
- Search, audience/category combinations, empty results, and invalid queries.
- Distinct sample audiences and correct filtering of shared or newly created items.
- Listing validation, rejected names, accented-letter names, image upload/retrieval, and persistence.
- Contact validation, trimming, persistence, concurrent writes, and submission rate limiting.
- Origin/content-type checks, storage failures, and keeping backend files and private records outside public routes.

Tests use temporary directories for JSON records. Upload tests also write fixtures into the ignored `finds-static/uploads/` directory. Automated tests exercise the HTTP API; check browser behavior manually after UI changes.

### Manual smoke test

1. Start the server and open Home. A fresh data directory shows the four seeded products.
2. Compare Woman and Men, then combine search with category and audience. Check matching and empty results, and reload to verify filter persistence.
3. Open details from a product photo, close the dialog, and check keyboard focus returns to that control.
4. Follow “List an Item” to Sell Now. Try a name containing numbers or symbols and check the field error.
5. Submit a valid listing with an explicitly chosen audience and a supported photo. Check the preview, saved confirmation, and catalogue entry.
6. Restart the server and confirm the listing and photo remain available.
7. Submit Contact and check the private record. The confirmation should report saving the message, without claiming an email was sent.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Catalogue does not load / API unavailable | Use the Node-served URL, check the server terminal, and open `/api/health`. Do not use `file://` or Live Server. |
| `esbuild` or another module cannot be found | Run `npm ci` from the root with development dependencies included. |
| `EADDRINUSE` / port already in use | Stop the other server on that port, or change `PORT` in `.env` and restart. |
| `.env not found. Continuing without it.` | Expected when using defaults; create `.env` only for custom configuration. |
| Frontend edit does not appear | In development mode, wait for a successful rebuild and refresh. With `npm start`, rebuild or restart after source edits. |
| Woman and Men share some results | Check audience labels. Items assigned to both should appear in both filters. |
| Kids or a category has no products | The combination may have no listings; the seeded catalogue has no Kids items. |
| Submission returns `429` | Failed requests also count. Wait for the 15-minute window to reset. |
| Upload is rejected | Use one JPEG, PNG, or WebP within the size limit. Renaming a file does not convert its format. |
| Saved data disappears after restart | Check that the same `DATA_DIR` and disk are being used. Photos must remain in `finds-static/uploads/`. |
| Server rejects `DATA_DIR` | Choose a location outside `finds-static/` and restart the npm process. |

## Contributing

1. Start from the latest `main` and create a branch for your change.
2. Edit page copy in `finds-static/*.html`, styles in `finds-static/css/style.css`, and interactive behavior in `frontend/`.
3. Keep repeated category menus and footers consistent across all six HTML pages. The active header is rendered by `Header.jsx`; HTML contains its fallback markup.
4. Change shared listing rules in `shared/listing-validation.js` so the form and API stay aligned. Update regression tests when changing behavior.
5. Run the relevant checks and smoke tests, update documentation, and open a pull request describing the result and validation.

Keep runtime submissions, photos, generated bundles, dependencies, and local environment files out of commits. Add sample items to `server/data/products.json`; use the listing form to test runtime creation separately.

## Current limitations and next steps

Finds is designed for **local, single-process development on a writable disk**. Before operating a public marketplace, the project needs:

- **Identity and ownership:** seller registration, sign-in, listing ownership, and account management.
- **Listing management:** editing, deletion, moderation, and an administrative workflow. No public update/delete API exists today.
- **Transactions:** checkout, payment processing, orders, and seller/buyer communication.
- **Durable infrastructure:** a shared database, persistent object storage, and shared rate-limit state for multiple server instances.
- **Operations:** production configuration, HTTPS, monitoring, backup/recovery, and a deployment workflow.
- **User persistence:** account-backed favorites and email delivery for contact or transactional notifications.

In-memory request limits reset when the server restarts. File-based storage is unsuitable for hosts that discard local files between runs. This repository does not currently include a production deployment configuration.

## Team

| Page responsibility | Team member |
| --- | --- |
| Landing / Home | Joshi |
| How It Works | Jose |
| About Us | Ashley |
| Contact | Irene |
| FAQs | Abdul |

## License

This repository does not currently include a license file. An open-source license has not been declared.
