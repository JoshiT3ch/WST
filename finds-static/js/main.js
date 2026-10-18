/* Shared page interactions and same-origin Finds API requests. */
'use strict';

// Highlight links to the current page.
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-header a, .footer-links a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
const header = document.querySelector('.site-header');
const categoryMenus = document.querySelectorAll('.category-menu');
const desktopNavigation = window.matchMedia('(min-width: 901px)');
const hoverNavigation = window.matchMedia('(hover: hover) and (min-width: 901px)');
document.documentElement.classList.add('js');
function closeCategories(except = null) {
  categoryMenus.forEach(menu => {
    if (menu !== except) menu.open = false;
    menu.querySelector('summary').setAttribute('aria-expanded', String(menu.open));
  });
}
function openCategory(menu) {
  closeCategories(menu);
  menu.open = true;
  menu.querySelector('summary').setAttribute('aria-expanded', 'true');
}
function closeMenu(returnFocus = false) {
  const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open categories');
  navigation.classList.remove('is-open');
  closeCategories();
  if (returnFocus && wasOpen) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close categories' : 'Open categories');
  navigation.classList.toggle('is-open', open);
  if (!open) closeCategories();
});
categoryMenus.forEach(menu => {
  const summary = menu.querySelector('summary');
  summary.setAttribute('aria-controls', menu.querySelector('.mega-menu').id);
  summary.setAttribute('aria-expanded', 'false');
  menu.addEventListener('pointerenter', () => {
    if (hoverNavigation.matches) openCategory(menu);
  });
  menu.addEventListener('toggle', () => {
    if (menu.open) closeCategories(menu);
    summary.setAttribute('aria-expanded', String(menu.open));
  });
  summary.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openCategory(menu);
      menu.querySelector('.mega-menu a').focus();
    }
  });
});
header.addEventListener('pointerleave', () => {
  if (hoverNavigation.matches) closeCategories();
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const activeMenu = Array.from(categoryMenus).find(menu => menu.open);
  if (activeMenu) {
    closeCategories();
    activeMenu.querySelector('summary').focus();
  } else closeMenu(true);
});
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
header.addEventListener('focusout', event => {
  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
  else if (event.relatedTarget) {
    const previousMenu = event.target.closest('.category-menu');
    if (previousMenu && !previousMenu.contains(event.relatedTarget)) {
      previousMenu.open = false;
      previousMenu.querySelector('summary').setAttribute('aria-expanded', 'false');
    }
  }
});
desktopNavigation.addEventListener('change', () => closeMenu());

// Native details/summary supports keyboard users and also works without JS.
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
}));

// The server owns the catalogue; cards keep the existing HTML design.
const filters = document.querySelectorAll('[data-filter]');
const productGrid = document.querySelector('.product-grid');
const cardTemplate = productGrid?.querySelector('.product-card').cloneNode(true);
const searchForm = document.querySelector('.header-search');
const searchInput = document.querySelector('#header-search');
const searchEmpty = document.querySelector('#search-empty');
const productsStatus = document.querySelector('#products-status');
const retryProducts = document.querySelector('#retry-products');
const searchParams = new URLSearchParams(window.location.search);
searchInput.value = (searchParams.get('q') || '').slice(0, 100);
let selectedCategory = 'All';
const savedProducts = new Set();
const formatPrice = item => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: item.currency, maximumFractionDigits: 0
}).format(item.price);

async function requestApi(path, options = {}) {
  if (window.location.protocol === 'file:') throw new Error('Start the Node.js server with npm start, then open http://localhost:3000.');
  const response = await fetch(path, { ...options, signal: options.signal || AbortSignal.timeout(10000) });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The Finds API is unavailable. Open the website through the Node.js server.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete your request. Please try again.');
  return data;
}

function renderProducts(items) {
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const card = cardTemplate.cloneNode(true);
    card.hidden = false;
    card.dataset.category = item.category;
    card.dataset.audience = item.audiences.join(' ');
    const image = card.querySelector('.product-image img');
    image.src = item.image;
    image.alt = `Illustration of ${item.title.toLowerCase()}`;
    card.querySelector('.product-tag').textContent = item.condition;
    card.querySelector('.product-category').textContent = item.category;
    card.querySelector('.product-link').textContent = item.title;
    card.querySelector('.product-title-row strong').textContent = formatPrice(item);
    card.querySelector('.product-info p').textContent = `${item.size} · ${item.condition}`;
    card.querySelectorAll('[data-product]').forEach(button => {
      button.dataset.product = item.id;
      if (button.classList.contains('quick-view')) button.setAttribute('aria-label', `View ${item.title.toLowerCase()}`);
    });
    const save = card.querySelector('.save-button');
    const saved = savedProducts.has(item.id);
    save.dataset.save = item.id;
    save.dataset.title = item.title;
    save.setAttribute('aria-pressed', String(saved));
    save.setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${item.title.toLowerCase()}`);
    fragment.append(card);
  });
  productGrid.replaceChildren(fragment);
}

let searchRequest;
let searchTimer;
async function updateFinds() {
  clearTimeout(searchTimer);
  searchRequest?.abort();
  const controller = new AbortController();
  searchRequest = controller;
  productGrid.setAttribute('aria-busy', 'true');
  productGrid.hidden = true;
  searchEmpty.hidden = true;
  retryProducts.hidden = true;
  productsStatus.hidden = false;
  productsStatus.textContent = 'Loading finds…';
  try {
    const query = new URLSearchParams({ q: searchInput.value.trim(), audience: selectedCategory });
    const data = await requestApi(`/api/products?${query}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
    });
    if (controller.signal.aborted) return;
    renderProducts(data.products);
    productsStatus.hidden = true;
    productGrid.hidden = false;
    searchEmpty.hidden = data.total > 0;
  } catch (error) {
    if (controller.signal.aborted) return;
    productsStatus.textContent = error.name === 'TimeoutError' ? 'Loading took too long. Please try again.' : error.message;
    retryProducts.hidden = false;
  } finally {
    if (searchRequest === controller) productGrid.setAttribute('aria-busy', 'false');
  }
}

filters.forEach(filter => filter.addEventListener('click', () => {
  selectedCategory = filter.dataset.filter;
  filters.forEach(button => {
    const selected = button === filter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  updateFinds();
}));
if (productGrid) {
  updateFinds();
  retryProducts.addEventListener('click', updateFinds);
  searchInput.addEventListener('input', () => {
    searchRequest?.abort();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(updateFinds, 180);
  });
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    updateFinds();
    const url = new URL(window.location.href);
    const query = searchInput.value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    url.hash = 'featured';
    window.history.pushState(null, '', url);
    document.querySelector('#featured').scrollIntoView({ block: 'start' });
  });
  window.addEventListener('popstate', () => {
    searchInput.value = (new URLSearchParams(window.location.search).get('q') || '').slice(0, 100);
    updateFinds();
  });
}

let toastTimer;
function announce(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-save]');
  if (!button) return;
  const saved = !savedProducts.has(button.dataset.save);
  if (saved) savedProducts.add(button.dataset.save);
  else savedProducts.delete(button.dataset.save);
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${button.dataset.title.toLowerCase()}`);
  announce(saved ? 'Saved for this page visit. Refreshing clears your favorites.' : 'Removed from your favorites.');
});

const productDialog = document.querySelector('#product-dialog');
if (productDialog) {
  let opener;
  let detailRequest;
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-product]');
    if (!button) return;
    detailRequest?.abort();
    const controller = new AbortController();
    detailRequest = controller;
    button.disabled = true;
    try {
      const { product: item } = await requestApi(`/api/products/${encodeURIComponent(button.dataset.product)}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
      });
      if (controller.signal.aborted) return;
      opener = button;
      document.querySelector('#dialog-title').textContent = item.title;
      document.querySelector('#dialog-price').textContent = formatPrice(item);
      document.querySelector('#dialog-meta').textContent = `${item.size} · ${item.condition}`;
      document.querySelector('#dialog-description').textContent = item.description;
      const image = document.querySelector('#dialog-image');
      image.src = item.image;
      image.alt = `Illustration of ${item.title.toLowerCase()}`;
      productDialog.showModal();
      document.body.classList.add('dialog-open');
    } catch (error) {
      if (!controller.signal.aborted) announce(error.message);
    } finally {
      button.disabled = false;
    }
  });
  productDialog.querySelector('.dialog-close').addEventListener('click', () => productDialog.close());
  productDialog.addEventListener('click', event => {
    const bounds = productDialog.getBoundingClientRect();
    if (event.target === productDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) productDialog.close();
  });
  productDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (opener?.isConnected) opener.focus();
  });
}

// Keep entered text on failure; clear it only after the API confirms storage.
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  const success = document.querySelector('#form-success');
  const nameInput = document.querySelector('#name');
  const messageInput = document.querySelector('#message');
  const formError = document.querySelector('#form-error');
  const submit = contactForm.querySelector('[type="submit"]');
  function checkText() {
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
    messageInput.setCustomValidity(messageInput.value.trim().length >= 10 ? '' : 'Please enter a message with at least 10 characters.');
  }
  contactForm.addEventListener('input', checkText);
  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    checkText();
    if (!contactForm.reportValidity()) return;
    if (submit.disabled) return;
    submit.disabled = true;
    contactForm.setAttribute('aria-busy', 'true');
    formError.hidden = true;
    try {
      const fields = Object.fromEntries(new FormData(contactForm));
      await requestApi('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      contactForm.reset();
      contactForm.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      formError.textContent = error.name === 'TimeoutError' ? 'The request timed out. Please try again.' : error.message;
      formError.hidden = false;
      formError.focus();
    } finally {
      submit.disabled = false;
      contactForm.setAttribute('aria-busy', 'false');
    }
  });
  submit.disabled = false;
  document.querySelector('#try-again').addEventListener('click', () => {
    success.hidden = true;
    contactForm.hidden = false;
    nameInput.focus();
  });
}
