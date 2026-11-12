import { useEffect, useRef, useState } from 'react';
import { requestApi, errorMessage, formatPrice } from './api.js';
import { ArrowIcon, HeartIcon } from './ui.jsx';
import { listingCategories, listingAudiences } from '../shared/listing-validation.js';

const audiences = [
  ['All', 'All finds'],
  ['Woman', 'Woman'],
  ['Men', 'Men'],
  ['Kids', 'Kids']
];

const productCategories = ['All', ...listingCategories];

function readFilter(name, values) {
  const value = new URLSearchParams(window.location.search).get(name);
  return values.includes(value) ? value : 'All';
}

function ProductCard({ item, saved, busy, onSave, onView }) {
  const title = item.title.toLowerCase();
  return <article className="product-card" data-category={item.category} data-audience={item.audiences.join(' ')}>
    <div className="product-image">
      <button className="product-image-button" type="button" aria-label={`View details for ${title}`} aria-haspopup="dialog" disabled={busy} onClick={event => onView(item.id, event.currentTarget)}>
        <img src={item.image} alt={item.title} width="360" height="400" loading="lazy" />
      </button>
      <span className="product-tag">{item.condition}</span>
      <button className="save-button" type="button" aria-label={`${saved ? 'Unsave' : 'Save'} ${title}`} aria-pressed={saved} onClick={() => onSave(item.id)}><HeartIcon /></button>
      <button className="quick-view" type="button" aria-label={`View ${title}`} disabled={busy} onClick={event => onView(item.id, event.currentTarget)}>{busy ? 'Loading details…' : 'Take a closer look'} <ArrowIcon /></button>
    </div>
    <div className="product-info">
      <span className="product-category">{item.category}</span>
      <div className="product-title-row">
        <h3><button className="product-link" type="button" disabled={busy} onClick={event => onView(item.id, event.currentTarget)}>{item.title}</button></h3>
        <strong>{formatPrice(item)}</strong>
      </div>
      <p>{item.size} · {item.condition}</p>
      <p>For: {item.audiences.join(', ')}</p>
    </div>
  </article>;
}

function ProductDialog({ item, opener, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    document.body.classList.add('dialog-open');
    return () => {
      document.body.classList.remove('dialog-open');
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  function closeOnBackdrop(event) {
    const element = event.currentTarget;
    if (event.target !== element) return;
    const bounds = element.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) element.close();
  }

  return <dialog ref={dialog} id="product-dialog" className="product-dialog" aria-labelledby="dialog-title" onClose={onClose} onClick={closeOnBackdrop}>
    <button className="dialog-close" type="button" aria-label="Close item details" onClick={() => dialog.current.close()}>×</button>
    <div className="dialog-grid">
      <img src={item.image} alt={item.title} width="360" height="400" />
      <div className="dialog-copy">
        <span className="eyebrow">A SAMPLE FIND</span>
        <h2 id="dialog-title">{item.title}</h2>
        <p className="dialog-price">{formatPrice(item)}</p>
        <p>{item.size} · {item.condition}</p>
        <p>For: {item.audiences.join(', ')}</p>
        <p>{item.description}</p>
        <div className="demo-panel"><strong>Just a little preview.</strong><p>This is a sample listing. Purchasing and contacting a seller will be part of a future version.</p></div>
        <a className="button" href="how-it-works.html">See how Finds works <ArrowIcon /></a>
      </div>
    </div>
  </dialog>;
}

export function Catalogue({ query, searchRevision, announce }) {
  const [audience, setAudience] = useState(() => readFilter('audience', listingAudiences));
  const [productCategory, setProductCategory] = useState(() => readFilter('category', listingCategories));
  const [result, setResult] = useState({ status: 'loading', items: [], error: '' });
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [details, setDetails] = useState(null);
  const detailRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setResult(previous => ({ ...previous, status: 'loading', error: '' }));
    // A short delay combines rapid search input into one request.
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim(), audience, category: productCategory });
        const data = await requestApi(`/api/products?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ status: 'ready', items: data.products, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ status: 'error', items: [], error: errorMessage(error) });
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, audience, productCategory, retry, searchRevision]);

  useEffect(() => () => detailRequest.current?.abort(), []);

  useEffect(() => {
    function restoreFilters() {
      setAudience(readFilter('audience', listingAudiences));
      setProductCategory(readFilter('category', listingCategories));
    }
    window.addEventListener('popstate', restoreFilters);
    return () => window.removeEventListener('popstate', restoreFilters);
  }, []);

  function changeFilter(name, value) {
    const url = new URL(window.location.href);
    if (value === 'All') url.searchParams.delete(name);
    else url.searchParams.set(name, value);
    window.history.replaceState(null, '', url);
    if (name === 'audience') setAudience(value);
    else setProductCategory(value);
  }

  function toggleSaved(id) {
    const wasSaved = saved.has(id);
    setSaved(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    announce(wasSaved ? 'Removed from your favorites.' : 'Saved for this page visit. Refreshing clears your favorites.');
  }

  async function viewProduct(id, opener) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setBusyId(id);
    try {
      const { product } = await requestApi(`/api/products/${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!controller.signal.aborted) setDetails({ item: product, opener });
    } catch (error) {
      if (!controller.signal.aborted) announce(errorMessage(error));
    } finally {
      if (detailRequest.current === controller) setBusyId(null);
    }
  }

  function resetFilters() {
    changeFilter('audience', 'All');
    changeFilter('category', 'All');
  }

  return <>
    <div className="filter-row">
      <div className="filters" id="categories" role="group" aria-label="Filter featured finds">
        {audiences.map(([value, label]) => (
          <button key={value} className={`filter${audience === value ? ' active' : ''}`} type="button"
            data-filter={value} aria-pressed={audience === value} onClick={() => changeFilter('audience', value)}>
            {label}
          </button>
        ))}
        <label className="category-filter" htmlFor="product-category">Product category</label>
        <select id="product-category" value={productCategory} onChange={event => changeFilter('category', event.target.value)}>
          {productCategories.map(value => (
            <option key={value} value={value}>{value === 'All' ? 'All categories' : value}</option>
          ))}
        </select>
      </div>
    </div>
    <p className="catalogue-note">Items listed for more than one audience appear in each matching filter.</p>
    <p id="products-status" role="status" hidden={result.status === 'ready'}>{result.status === 'loading' ? 'Loading finds…' : result.error}</p>
    {result.status === 'error' ? <button className="button" id="retry-products" type="button" onClick={() => setRetry(previous => previous + 1)}>Try loading again</button> : null}
    <div className="product-grid" aria-busy={result.status === 'loading'} hidden={result.status !== 'ready'}>
      {result.items.map(item => <ProductCard key={item.id} item={item} saved={saved.has(item.id)} busy={busyId === item.id} onSave={toggleSaved} onView={viewProduct} />)}
    </div>
    <p className="search-empty" id="search-empty" role="status" hidden={result.status !== 'ready' || result.items.length > 0}>
      No finds match your search. Try another word or <a href="index.html#featured" onClick={event => { if (!query.trim()) { event.preventDefault(); resetFilters(); } }}>browse all finds</a>.
    </p>
    {details ? <ProductDialog {...details} onClose={() => setDetails(null)} /> : null}
  </>;
}
