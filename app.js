/* Katerina's Kitchen. Static recipe book: all content lives in data/recipes.json */
(() => {
  const app = document.getElementById('app');
  const searchInput = document.getElementById('search');
  let DATA = { categories: [], recipes: [] };
  let activeCategory = 'all';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cat = (id) => DATA.categories.find((c) => c.id === id) || { id, name: id, color: '#f3c665' };
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

  const SQUIGGLE = (color) => `<svg class="squiggle" width="118" height="12" viewBox="0 0 118 12" fill="none" aria-hidden="true"><path d="M2 6c7-6 12-6 19 0s12 6 19 0 12-6 19 0 12 6 19 0 12-6 19 0 12 6 19 0" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/></svg>`;

  const art = (r) => {
    const c = cat(r.category);
    const initial = `<span class="initial" aria-hidden="true">${esc(r.title.trim()[0] || '?')}</span>`;
    const img = safeUrl(r.image) ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">${initial}` : initial;
    return { style: `--tile:${esc(c.color)}`, inner: img };
  };

  const card = (r) => {
    const a = art(r), m = r.macros || {};
    return `
      <a class="card" href="#/recipe/${encodeURIComponent(r.id)}">
        <div class="card-art" style="${a.style}">${a.inner}</div>
        <div class="card-body">
          <h3 class="card-title">${esc(r.title)}</h3>
          <p class="card-sub">${esc(cat(r.category).name)}${totalTime(r) ? ' · ' + totalTime(r) + ' min' : ''}</p>
          <span class="card-macros">${m.calories != null ? `${m.calories} kcal · ${m.protein} g protein` : ''}</span>
          <span class="card-go" aria-hidden="true">→</span>
        </div>
      </a>`;
  };

  const totalTime = (r) => (r.prepMinutes || 0) + (r.cookMinutes || 0);
  const sorted = () => [...DATA.recipes].sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));

  function filtered() {
    const q = searchInput.value.trim().toLowerCase();
    return sorted().filter((r) => {
      if (activeCategory !== 'all' && r.category !== activeCategory) return false;
      if (!q) return true;
      const hay = [r.title, r.description, cat(r.category).name, ...(r.tags || []), ...(r.ingredients || []).map((i) => i.item)].join(' ').toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
  }

  function chips() {
    const used = DATA.categories.filter((c) => DATA.recipes.some((r) => r.category === c.id));
    const btn = (id, name, n) => `<button class="chip" data-cat="${esc(id)}" aria-pressed="${activeCategory === id}">${esc(name)}<small>${n}</small></button>`;
    return `<div class="chips" role="group" aria-label="Filter by category">${btn('all', 'All', DATA.recipes.length)}${used.map((c) => btn(c.id, c.name, DATA.recipes.filter((r) => r.category === c.id).length)).join('')}</div>`;
  }

  function gridHtml() {
    const list = filtered();
    return list.length ? list.map(card).join('') : `<p class="empty">No recipes match that yet.</p>`;
  }

  function renderList() {
    app.innerHTML = `
      <section class="collection full">
        <h1 class="sr-only">All recipes</h1>
        <div class="intro">${chips()}</div>
        <div class="grid" id="grid">${gridHtml()}</div>
      </section>`;
  }

  /* Quantities */
  const FRACTIONS = [[0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']];
  const METRIC = new Set(['g', 'kg', 'ml', 'l']);
  function fmtQty(q, unit) {
    if (q == null || q === '') return '';
    if (typeof q !== 'number') return String(q);
    if (METRIC.has((unit || '').toLowerCase())) {
      return String(q >= 100 ? Math.round(q / 5) * 5 : q >= 10 ? Math.round(q) : Math.round(q * 10) / 10);
    }
    const whole = Math.floor(q + 0.02), rest = q - whole;
    if (rest < 0.06) return String(whole);
    const f = FRACTIONS.reduce((best, x) => (Math.abs(x[0] - rest) < Math.abs(best[0] - rest) ? x : best));
    if (Math.abs(f[0] - rest) > 0.07) return String(Math.round(q * 10) / 10);
    return (whole ? whole + ' ' : '') + f[1];
  }

  function ingredientsHtml(r, servings) {
    const k = servings / (r.servings || 1);
    let out = '', group = null, open = false;
    (r.ingredients || []).forEach((i) => {
      if ((i.group || '') !== (group ?? '')) {
        if (open) out += '</ul>';
        group = i.group || '';
        if (group) out += `<h3>${esc(group)}</h3>`;
        out += '<ul>'; open = true;
      } else if (!open) { out += '<ul>'; open = true; }
      const qty = fmtQty(typeof i.qty === 'number' ? i.qty * k : i.qty, i.unit);
      const amount = [qty, i.unit].filter(Boolean).join(' ');
      out += `<li><label><input type="checkbox"><span>${amount ? `<span class="qty">${esc(amount)}</span> ` : ''}${esc(i.item)}${i.note ? `, ${esc(i.note)}` : ''}</span></label></li>`;
    });
    return out + (open ? '</ul>' : '');
  }

  function renderRecipe(id) {
    const r = DATA.recipes.find((x) => x.id === id);
    if (!r) { app.innerHTML = `<section class="recipe"><p class="empty">That recipe isn't in the book. <a href="#/recipes">Back to all recipes</a></p></section>`; return; }
    const a = art(r), m = r.macros || {}, c = cat(r.category);
    let servings = r.servings || 1;
    const src = r.source || {};
    const macro = (v, unit, label) => `<div class="macro"><b>${v != null ? esc(v) : '?'}${unit}</b><span>${label}</span></div>`;
    document.title = `${r.title} · Katerina's Kitchen`;
    app.innerHTML = `
      <article class="recipe">
        <a class="link-underline" href="#/recipes">← All recipes</a>
        <div class="recipe-top">
          <div>
            <p class="eyebrow">${esc(c.name)}</p>
            <h1>${esc(r.title)}</h1>
            ${SQUIGGLE('#8566ad')}
            ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ''}
            <div class="meta">
              ${r.prepMinutes ? `<div><b>${r.prepMinutes} min</b>Prep</div>` : ''}
              ${r.cookMinutes ? `<div><b>${r.cookMinutes} min</b>Cook</div>` : ''}
              <div><b class="stepper">
                <button type="button" id="less" aria-label="Fewer servings">−</button>
                <span id="servings" aria-live="polite">${servings}</span>
                <button type="button" id="more" aria-label="More servings">+</button>
              </b>Servings</div>
            </div>
            ${(r.tags || []).length ? `<div class="tags">${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <figure class="recipe-figure"><div class="recipe-art" style="${a.style}">${a.inner}</div>${safeUrl(r.image) && safeUrl(src.url) ? `<figcaption>Photo: <a href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener noreferrer">${esc(src.name || "original recipe")}</a></figcaption>` : ""}</figure>
        </div>
        <section class="macros" aria-label="Macros per serving">
          <div class="macros-head"><span>Macros per serving</span><span class="pill">${r.macrosEstimated === 'partial' ? 'Partly estimated' : r.macrosEstimated ? 'Estimated' : 'From the source'}</span></div>
          <div class="macros-grid">
            ${macro(m.calories, '', 'Kcal')}${macro(m.protein, 'g', 'Protein')}${macro(m.carbs, 'g', 'Carbs')}${macro(m.fat, 'g', 'Fat')}${macro(m.fiber, 'g', 'Fibre')}
          </div>
        </section>
        <div class="recipe-cols">
          <section class="ingredients"><h2>Ingredients</h2><div id="ing">${ingredientsHtml(r, servings)}</div></section>
          <section class="steps">
            <h2>Method</h2>
            <ol>${(r.steps || []).map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
            ${r.notes ? `<div class="notes"><p class="eyebrow">Notes</p><p>${esc(r.notes)}</p></div>` : ''}
            ${src.name || src.url ? `<p class="source">Source: ${safeUrl(src.url) ? `<a href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener noreferrer">${esc(src.name || src.url)}</a>` : esc(src.name)}</p>` : ''}
          </section>
        </div>
      </article>`;
    const set = (n) => {
      servings = Math.max(1, Math.min(48, n));
      document.getElementById('servings').textContent = servings;
      document.getElementById('ing').innerHTML = ingredientsHtml(r, servings);
    };
    document.getElementById('less').onclick = () => set(servings - 1);
    document.getElementById('more').onclick = () => set(servings + 1);
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    document.title = "Katerina's Kitchen · Recipe Book";
    if (hash.startsWith('recipe/')) renderRecipe(decodeURIComponent(hash.slice(7)));
    else renderList();
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeCategory = chip.dataset.cat;
    app.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === activeCategory)));
    document.getElementById('grid').innerHTML = gridHtml();
  });

  searchInput.addEventListener('input', () => {
    if (location.hash.startsWith('#/recipe/') || !document.getElementById('grid')) { location.hash = '#/recipes'; return; }
    document.getElementById('grid').innerHTML = gridHtml();
    if (!location.hash.includes('recipes')) document.getElementById('recipes')?.scrollIntoView({ block: 'start' });
  });

  window.addEventListener('hashchange', route);

  fetch('data/recipes.json', { cache: 'no-cache' })
    .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then((d) => {
      DATA = d;
      route();
    })
    .catch(() => { app.innerHTML = '<section class="recipe"><p class="empty">Could not load the recipes file.</p></section>'; });
})();
