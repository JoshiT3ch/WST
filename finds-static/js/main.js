/* Shared interactions for all five pages. No requests, accounts, or storage. */
'use strict';

// Highlight the current page, even when served from a folder URL.
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// The navigation stays usable without JavaScript; enhancement enables its toggle.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
document.documentElement.classList.add('js');
function closeMenu(returnFocus = false) {
  const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  navigation.classList.remove('is-open');
  if (returnFocus && wasOpen) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
document.querySelector('.site-header').addEventListener('focusout', event => {
  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
});
window.matchMedia('(min-width: 901px)').addEventListener('change', () => closeMenu());

// Native details/summary supports keyboard users and also works without JS.
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
}));

// Frontend category filtering, with a live result count.
const filters = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('.product-card');
filters.forEach(filter => filter.addEventListener('click', () => {
  filters.forEach(button => {
    const selected = button === filter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  let visible = 0;
  cards.forEach(card => {
    card.hidden = filter.dataset.filter !== 'All' && card.dataset.category !== filter.dataset.filter;
    if (!card.hidden) visible++;
  });
  document.querySelector('#filter-status').textContent = `${visible} sample ${visible === 1 ? 'find' : 'finds'} · Illustrations and prices are for demonstration.`;
}));

let toastTimer;
function announce(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}
document.querySelectorAll('.save-button').forEach(button => {
  const title = button.getAttribute('aria-label').replace('Save ', '');
  button.addEventListener('click', () => {
    const saved = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${title}`);
    announce(saved ? 'Saved for this page visit. Refreshing clears your favorites.' : 'Removed from your favorites.');
  });
});

// Sample data is kept here so a future API can replace it in one place.
const products = {
  "jacket": {
    "title": "Vintage denim jacket",
    "category": "Clothing",
    "price": "₱650",
    "meta": "Medium · Like new",
    "description": "A relaxed denim layer with a lived-in blue wash. An easy everyday piece with plenty of stories left to tell.",
    "image": "images/products/jacket.svg"
  },
  "shirt": {
    "title": "The everyday tee",
    "category": "Clothing",
    "price": "₱250",
    "meta": "Medium · Good",
    "description": "A soft, off-white graphic tee with a relaxed fit. A simple staple for slow days and everyday adventures.",
    "image": "images/products/shirt.svg"
  },
  "bag": {
    "title": "Everywhere canvas tote",
    "category": "Accessories",
    "price": "₱350",
    "meta": "One size · Like new",
    "description": "A roomy olive canvas tote for books, market runs, and everything in between.",
    "image": "images/products/bag.svg"
  },
  "sneakers": {
    "title": "Weekend sneakers",
    "category": "Shoes",
    "price": "₱850",
    "meta": "EU 38 · Good",
    "description": "Cream and sage low-top sneakers with a classic silhouette. A comfortable finishing touch for a casual outfit.",
    "image": "images/products/sneakers.svg"
  }
};
const productDialog = document.querySelector('#product-dialog');
if (productDialog) {
  let opener;
  document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => {
    const item = products[button.dataset.product];
    if (!item) return;
    opener = button;
    document.querySelector('#dialog-title').textContent = item.title;
    document.querySelector('#dialog-price').textContent = item.price;
    document.querySelector('#dialog-meta').textContent = item.meta;
    document.querySelector('#dialog-description').textContent = item.description;
    const image = document.querySelector('#dialog-image');
    image.src = item.image;
    image.alt = `Illustration of ${item.title.toLowerCase()}`;
    productDialog.showModal();
    document.body.classList.add('dialog-open');
  }));
  productDialog.querySelector('.dialog-close').addEventListener('click', () => productDialog.close());
  productDialog.addEventListener('click', event => {
    const bounds = productDialog.getBoundingClientRect();
    if (event.target === productDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) productDialog.close();
  });
  productDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (opener) opener.focus();
  });
}

// Demonstration only: prevent submission, validate locally, then clear the form.
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  const success = document.querySelector('#form-success');
  const nameInput = document.querySelector('#name');
  const messageInput = document.querySelector('#message');
  function checkText() {
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
    messageInput.setCustomValidity(messageInput.value.trim().length >= 10 ? '' : 'Please enter a message with at least 10 characters.');
  }
  contactForm.addEventListener('input', checkText);
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    checkText();
    if (!contactForm.reportValidity()) return;
    contactForm.reset();
    contactForm.hidden = true;
    success.hidden = false;
    success.focus();
  });
  // Enable only after the local-only submit handler is installed.
  contactForm.querySelector('[type="submit"]').disabled = false;
  document.querySelector('#try-again').addEventListener('click', () => {
    success.hidden = true;
    contactForm.hidden = false;
    nameInput.focus();
  });
}
