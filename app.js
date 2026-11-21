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

  const ring = (id, text, fill) => `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><path id="${id}" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>
      ${fill ? `<circle cx="100" cy="100" r="98" fill="${fill}"/>` : ''}
      <text font-family="DM Sans, sans-serif" font-size="17" font-weight="700" letter-spacing="5.2" fill="#36381c">
        <textPath href="#${id}">${text}</textPath>
      </text>
      <g transform="translate(100 100)" fill="none" stroke="#8566ad" stroke-width="5" stroke-linecap="round">
        <path d="M-22 -8h44a22 22 0 0 1-44 0z" fill="#8566ad"/>
        <path d="M-8 -26c-5-6 5-9 0-15M8 -26c-5-6 5-9 0-15"/>
      </g>
    </svg>`;

  const BOWL = `
    <svg class="bowl" viewBox="0 0 440 400" aria-hidden="true">
      <ellipse cx="220" cy="352" rx="150" ry="20" fill="#a84522"/>
      <path d="M150 300h140l-14 46a12 12 0 0 1-12 9h-88a12 12 0 0 1-12-9z" fill="#b9a8cf"/>
      <path d="M40 176h360c0 92-74 150-180 150S40 268 40 176z" fill="#d2c4e0"/>
      <path d="M76 214c14 52 60 86 128 92" fill="none" stroke="#f7ebde" stroke-width="9" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="220" cy="176" rx="180" ry="34" fill="#b9a8cf"/>
      <ellipse cx="220" cy="176" rx="160" ry="24" fill="#f3c665"/>
      <circle cx="160" cy="170" r="17" fill="#dd6f58"/><circle cx="262" cy="180" r="14" fill="#dd6f58"/>
      <circle cx="212" cy="166" r="11" fill="#f7ebde"/><circle cx="300" cy="166" r="9" fill="#f7ebde"/>
      <path d="M118 176c14-16 30-14 38-4M226 186c12-10 26-8 32 0M288 178c8-12 24-12 32-4" fill="none" stroke="#59682f" stroke-width="8" stroke-linecap="round"/>
      <g fill="none" stroke="#f7ebde" stroke-width="9" stroke-linecap="round" opacity=".9">
        <path d="M160 112c-18-22 18-34 0-58"/><path d="M220 100c-18-24 18-38 0-64"/><path d="M280 112c-18-22 18-34 0-58"/>
      </g>
    </svg>`;

  const art = (r) => {
    const c = cat(r.category);
    const img = r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : `<span class="initial" aria-hidden="true">${esc(r.title.trim()[0] || '?')}</span>`;
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

  function renderHome() {
    const usedCats = new Set(DATA.recipes.map((r) => r.category)).size;
    app.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">Home cooking</p>
          <h1>Good food, written down.</h1>
          ${SQUIGGLE('#8566ad')}
          <p class="lead">Recipes worth keeping, with the macros already worked out.</p>
          <a class="btn" href="#/recipes">Browse all recipes <span aria-hidden="true">→</span></a>
        </div>
        <div class="hero-art">${BOWL}<div class="badge">${ring('ring-a', 'MADE AT HOME · WITH LOVE · ', '#f3c665')}</div></div>
      </section>
      <section class="band" aria-label="At a glance"><div class="band-inner">
        <div class="band-item"><span class="band-num">${DATA.recipes.length}</span><span>Recipes<br>saved</span></div>
        <div class="band-item"><span class="band-num">${usedCats}</span><span>Categories<br>so far</span></div>
        <div class="band-item"><span class="band-num">%</span><span>Macros on<br>every recipe</span></div>
        <div class="band-item"><span class="band-num">×</span><span>Scales to<br>any serving</span></div>
      </div></section>
      <section class="collection" id="recipes">
        <div class="intro">
          <p class="eyebrow">The collection</p>
          <h2>Better home cooking.</h2>
          ${SQUIGGLE('#c2542b')}
          <p>Newest first. Pick a category or search by ingredient.</p>
          <a class="link-underline" href="#/recipes">See all recipes</a>
          ${chips()}
        </div>
        <div class="grid" id="grid">${gridHtml()}</div>
      </section>
      <section class="feature">
        <div class="feature-main">
          <p class="eyebrow">Cooking made simple</p>
          <h2>Every day is a good cooking day.</h2>
          <p>Tick off ingredients as you go and change the servings to fit the table.</p>
          <a class="link-underline" href="#/recipes">Explore recipes</a>
        </div>
        <div class="stamp">${ring('ring-b', 'GOOD FOOD · GOOD MOOD · GOOD FOOD · ', '')}</div>
      </section>`;
  }

  function renderList() {
    app.innerHTML = `
      <section class="collection full">
        <div class="intro">
          <p class="eyebrow">All recipes</p>
          <h2>The whole book.</h2>
          ${chips()}
        </div>
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
          <div class="recipe-art" style="${a.style}">${a.inner}</div>
        </div>
        <section class="macros" aria-label="Macros per serving">
          <div class="macros-head"><span>Macros per serving</span>${r.macrosEstimated ? '<span class="pill">Estimated</span>' : '<span class="pill">From the source</span>'}</div>
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
    else if (hash === 'recipes') renderList();
    else renderHome();
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
      document.getElementById('footer-count').textContent = `${d.recipes.length} recipes`;
      route();
    })
    .catch(() => { app.innerHTML = '<section class="recipe"><p class="empty">Could not load the recipes file.</p></section>'; });
})();
