import { useEffect, useRef, useState } from 'react';

export function Header({ query, onQueryChange, onSearch }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  useEffect(() => {
    const navigation = document.querySelector('#primary-nav');
    navigation.classList.toggle('is-open', open);
    if (!open) navigation.querySelectorAll('details').forEach(menu => { menu.open = false; });
  }, [open]);

  useEffect(() => {
    // React owns the menu button; the existing category links use native details.
    const header = document.querySelector('.site-header');
    const navigation = document.querySelector('#primary-nav');
    const menus = [...navigation.querySelectorAll('.category-menu')];
    const desktop = window.matchMedia('(min-width: 901px)');
    const hover = window.matchMedia('(hover: hover) and (min-width: 901px)');
    const removers = [];
    function listen(target, type, handler) {
      target.addEventListener(type, handler);
      removers.push(() => target.removeEventListener(type, handler));
    }
    function closeCategories(except = null) {
      menus.forEach(menu => {
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
      const wasOpen = menuButton.current?.getAttribute('aria-expanded') === 'true';
      setOpen(false);
      closeCategories();
      if (returnFocus && wasOpen) menuButton.current.focus();
    }
    menus.forEach(menu => {
      const summary = menu.querySelector('summary');
      summary.setAttribute('aria-controls', menu.querySelector('.mega-menu').id);
      summary.setAttribute('aria-expanded', String(menu.open));
      listen(menu, 'pointerenter', () => { if (hover.matches) openCategory(menu); });
      listen(menu, 'toggle', () => {
        if (menu.open) closeCategories(menu);
        summary.setAttribute('aria-expanded', String(menu.open));
      });
      listen(summary, 'keydown', event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openCategory(menu);
          menu.querySelector('.mega-menu a').focus();
        }
      });
    });
    listen(header, 'pointerleave', () => { if (hover.matches) closeCategories(); });
    listen(navigation, 'click', event => { if (event.target.closest('a')) closeMenu(); });
    listen(document, 'click', event => { if (!header.contains(event.target)) closeMenu(); });
    listen(document, 'keydown', event => {
      if (event.key !== 'Escape') return;
      const activeMenu = menus.find(menu => menu.open);
      if (activeMenu) {
        closeCategories();
        activeMenu.querySelector('summary').focus();
      } else closeMenu(true);
    });
    listen(header, 'focusout', event => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
      else if (event.relatedTarget) {
        const previous = event.target.closest('.category-menu');
        if (previous && !previous.contains(event.relatedTarget)) {
          previous.open = false;
          previous.querySelector('summary').setAttribute('aria-expanded', 'false');
        }
      }
    });
    listen(desktop, 'change', () => closeMenu());
    return () => removers.forEach(remove => remove());
  }, []);

  return <>
    <a className="marketplace-logo" href="index.html" aria-label="Finds home" aria-current={currentPage === 'index.html' ? 'page' : undefined}>FINDS</a>
    <form className="header-search" role="search" action="index.html#featured" method="get" onSubmit={onSearch}>
      <label className="search-kind" htmlFor="header-search">Listings</label>
      <input id="header-search" type="search" name="q" placeholder="What are you looking for?" aria-label="Search Finds listings" maxLength={100} value={query} onChange={event => onQueryChange(event.target.value)} />
      <button type="submit" aria-label="Search"><svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg></button>
    </form>
    <div className="header-actions"><a href="contact.html#contact-form">Sell Now</a><a className="header-about" href="about.html" aria-current={currentPage === 'about.html' ? 'page' : undefined}>About Finds</a></div>
    <button ref={menuButton} className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-nav" aria-label={open ? 'Close categories' : 'Open categories'} onClick={() => setOpen(previous => !previous)}><span /><span /></button>
  </>;
}
