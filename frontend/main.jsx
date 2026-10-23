import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Header } from './Header.jsx';
import { Catalogue } from './Catalogue.jsx';
import { ContactForm } from './ContactForm.jsx';
import { SellForm } from './SellForm.jsx';

const targets = {
  header: document.querySelector('.marketplace-top'),
  catalogue: document.querySelector('#catalogue-root'),
  contact: document.querySelector('#contact-root'),
  sell: document.querySelector('#sell-root'),
  toast: document.querySelector('#toast-root')
};
const readQuery = () => (new URLSearchParams(window.location.search).get('q') || '').slice(0, 100);

function App() {
  const [query, setQuery] = useState(readQuery);
  const [searchRevision, setSearchRevision] = useState(0);
  const [toast, setToast] = useState(null);
  const announce = useCallback(message => setToast({ message }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onPopState = () => setQuery(readQuery());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function search(event) {
    if (!targets.catalogue) return; // Other pages navigate using the form's native GET action.
    event.preventDefault();
    setSearchRevision(previous => previous + 1);
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    url.hash = 'featured';
    window.history.pushState(null, '', url);
    document.querySelector('#featured').scrollIntoView({ block: 'start' });
  }

  return <>
    {createPortal(<Header query={query} onQueryChange={setQuery} onSearch={search} />, targets.header)}
    {targets.catalogue ? createPortal(<Catalogue query={query} searchRevision={searchRevision} announce={announce} />, targets.catalogue) : null}
    {targets.contact ? createPortal(<ContactForm />, targets.contact) : null}
    {targets.sell ? createPortal(<SellForm />, targets.sell) : null}
    {createPortal(<div className={`toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite">{toast?.message}</div>, targets.toast)}
  </>;
}

// Each portal owns its complete interactive region. Static content stays in HTML.
Object.values(targets).forEach(target => target?.replaceChildren());
document.documentElement.classList.add('js');
const root = document.createElement('div');
root.id = 'react-root';
document.body.append(root);
createRoot(root).render(<StrictMode><App /></StrictMode>);

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.footer-links a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
}));
