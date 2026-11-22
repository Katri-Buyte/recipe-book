/* Katerina's Kitchen. Static recipe book: all content lives in data/recipes.json */
(() => {
  const app = document.getElementById('app');
  const searchInput = document.getElementById('search');
  let DATA = { categories: [], recipes: [] };
  let PLANS = { weeks: [] };
  let activeCategory = 'all';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cat = (id) => DATA.categories.find((c) => c.id === id) || { id, name: id, color: '#f3c665' };
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const safeImg = (u) => (/^https?:\/\//i.test(u || '') || /^images\/[\w.-]+$/.test(u || '') ? u : '');

  const SQUIGGLE = (color) => `<svg class="squiggle" width="118" height="12" viewBox="0 0 118 12" fill="none" aria-hidden="true"><path d="M2 6c7-6 12-6 19 0s12 6 19 0 12-6 19 0 12 6 19 0 12-6 19 0 12 6 19 0" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/></svg>`;

  const art = (r) => {
    const c = cat(r.category);
    const initial = `<span class="initial" aria-hidden="true">${esc(r.title.trim()[0] || '?')}</span>`;
    const img = safeImg(r.image) ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">${initial}` : initial;
    return { style: `--tile:${esc(c.color)}`, inner: img };
  };

  const card = (r) => {
    const a = art(r), m = r.macros || {};
    return `
      <a class="card" href="#/recipe/${encodeURIComponent(r.id)}">
        <div class="card-art" style="${a.style}">${a.inner}${r.speedi ? '<span class="badge-speedi">Ninja Speedi</span>' : ''}</div>
        <div class="card-body">
          <h3 class="card-title">${esc(r.title)}</h3>
          <p class="card-sub">${esc(cat(r.category).name)}${totalTime(r) ? ' · ' + totalTime(r) + ' min' : ''}</p>
          <span class="card-macros">${m.calories != null ? `${m.calories} kcal · ${m.protein} g protein` : ''}</span>
          <span class="card-go" aria-hidden="true">→</span>
        </div>
      </a>`;
  };

  const totalTime = (r) => (r.prepMinutes || 0) + (r.cookMinutes || 0);
  const sorted = () => [...DATA.recipes].sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')) || (safeImg(b.image) ? 1 : 0) - (safeImg(a.image) ? 1 : 0));

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

  /* Home navigation: next planned day + main categories */
  const HOME_CATS = ['breakfast', 'mains', 'soups-legumes', 'salads-sides'];

  function nextPlanDay() {
    const today = todayIso();
    const days = (PLANS.weeks || []).flatMap((w) => w.days).filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return days[0] || null;
  }

  function mealSummary(list) {
    return (list || []).map((x) => {
      if (x.group) return x.group;
      if (x.recipe) { const rec = DATA.recipes.find((r) => r.id === x.recipe); return rec ? rec.title : x.recipe; }
      return String(x.label || x.food).split(',')[0];
    }).join(' + ');
  }

  function heroHtml() {
    const d = nextPlanDay();
    let planCard;
    if (d) {
      const today = todayIso();
      const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
      const tomorrow = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
      const when = d.date === today ? 'Today' : d.date === tomorrow ? 'Tomorrow' : fmtDay(d.date);
      const t = dayTotals(d);
      planCard = `
        <p class="eyebrow">Meal plan · ${esc(fmtShort(d.date))}</p>
        <h2>${esc(when)}</h2>
        <dl class="today-meals">
          ${MEALS.map(([k, label]) => `<div><dt>${label}</dt><dd>${esc(mealSummary(d.meals[k])) || '–'}</dd></div>`).join('')}
        </dl>
        <p class="today-totals"><b>${Math.round(t[0]).toLocaleString('en-GB')}</b> kcal · <b>${Math.round(t[1])} g</b> protein · <b>${Math.round(t[2])} g</b> carbs · <b>${Math.round(t[3])} g</b> fat</p>
        <a class="btn btn-light" href="#/plan">Open meal plan <span aria-hidden="true">→</span></a>`;
    } else {
      planCard = `
        <p class="eyebrow">Meal plan</p>
        <h2>No plan for the coming days yet</h2>
        <p class="today-totals">Ask Claude for next week's plan.</p>
        <a class="btn btn-light" href="#/plan">See past plans <span aria-hidden="true">→</span></a>`;
    }
    const cards = HOME_CATS.map((id) => {
      const c = cat(id);
      const list = sorted().filter((r) => r.category === id);
      const photo = list.find((r) => safeImg(r.image));
      const n = list.length;
      return `
        <button type="button" class="cat-card${n ? '' : ' is-empty'}" data-cat="${esc(id)}" style="--tile:${esc(c.color)}" ${n ? '' : 'aria-disabled="true"'}>
          <span class="cat-art">${photo ? `<img src="${esc(photo.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
          <span class="cat-label"><b>${esc(c.name)}</b><small>${n ? `${n} recipe${n === 1 ? '' : 's'}` : 'Coming soon'}</small></span>
        </button>`;
    }).join('');
    return `
      <section class="home-hero" aria-label="Quick links">
        <div class="today-card">${planCard}</div>
        <div class="cat-cards">${cards}</div>
      </section>`;
  }

  function selectCategory(id) {
    activeCategory = id;
    app.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === activeCategory)));
    const grid = document.getElementById('grid');
    grid.innerHTML = gridHtml();
  }

  function renderList() {
    app.innerHTML = `
      ${heroHtml()}
      <section class="collection full" id="recipes">
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

  function speediHtml(s) {
    if (!s || !(s.steps || []).length) return '';
    const cell = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
    return `
      <section class="speedi" aria-label="Ninja Speedi settings">
        <div class="speedi-head">
          <h2>Ninja Speedi</h2>
          <span class="pill ${s.origin === 'recipe' ? '' : 'pill-warn'}">${s.origin === 'recipe' ? 'From the recipe' : 'Adapted, check the first time'}</span>
        </div>
        ${s.steps.map((st) => `
          <div class="speedi-step">
            ${st.food ? `<p class="speedi-food">${esc(st.food)}</p>` : ''}
            <dl class="speedi-grid">
              ${cell('Setting', st.fn)}${cell('Temperature', `${st.temp}°C`)}${cell('Time', st.time)}${cell('Crisper tray', st.tray)}${cell('Water', st.water || 'None')}
            </dl>
            ${st.note ? `<p class="speedi-note">${esc(st.note)}</p>` : ''}
          </div>`).join('')}
        ${s.note ? `<p class="speedi-foot">${esc(s.note)}</p>` : ''}
      </section>`;
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
          <figure class="recipe-figure"><div class="recipe-art" style="${a.style}">${a.inner}</div>${safeImg(r.image) && safeUrl(src.url) ? `<figcaption>Photo: <a href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener noreferrer">${esc(src.name || "original recipe")}</a></figcaption>` : ""}</figure>
        </div>
        <section class="macros" aria-label="Macros per serving">
          <div class="macros-head"><span>Macros per serving</span><span class="pill">${r.macrosEstimated === 'partial' ? 'Partly estimated' : r.macrosEstimated ? 'Estimated' : 'From the source'}</span></div>
          <div class="macros-grid">
            ${macro(m.calories, '', 'Kcal')}${macro(m.protein, 'g', 'Protein')}${macro(m.carbs, 'g', 'Carbs')}${macro(m.fat, 'g', 'Fat')}${macro(m.fiber, 'g', 'Fibre')}
          </div>
        </section>
        ${speediHtml(r.speedi)}
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

  /* Meal plan */
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snacks', 'Snacks'], ['dinner', 'Dinner']];
  const MKEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayIso = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  const fmtDay = (s) => parseDate(s).toLocaleDateString('en-GB', { weekday: 'long' });
  const fmtShort = (s) => parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const flatItems = (list) => (list || []).flatMap((x) => (x.group ? x.items : [x]));
  const portionLabel = (p) => (p === 1 ? '1 serving' : `${fmtQty(p, '')} serving`);

  function itemMacros(it) {
    if (it.recipe) {
      const rec = DATA.recipes.find((r) => r.id === it.recipe);
      const m = (rec && rec.macros) || {};
      return MKEYS.map((k) => (m[k] || 0) * (it.portion ?? 1));
    }
    const f = (PLANS.foods || {})[it.food];
    if (!f) return MKEYS.map(() => 0);
    return MKEYS.map((k) => (f.macros[k] || 0) * (it.amount ?? 1) / (f.per || 1));
  }
  const sumItems = (items) => items.reduce((t, it) => itemMacros(it).map((v, n) => t[n] + v), MKEYS.map(() => 0));
  const dayTotals = (d) => sumItems(MEALS.flatMap(([k]) => flatItems(d.meals[k])));

  function itemHtml(it) {
    if (it.recipe) {
      const rec = DATA.recipes.find((r) => r.id === it.recipe);
      const name = rec ? rec.title : it.recipe;
      return `<li><a href="#/recipe/${encodeURIComponent(it.recipe)}">${esc(name)}</a> <span class="portion">${esc(portionLabel(it.portion ?? 1))}</span></li>`;
    }
    const f = (PLANS.foods || {})[it.food] || {};
    return `<li>${esc(it.label || `${it.amount} ${f.unit || ''} ${f.name || it.food}`)}</li>`;
  }

  function mealHtml(list) {
    if (!list || !list.length) return '<p class="meal-empty">Nothing planned</p>';
    return list.map((x) => (x.group
      ? `<div class="meal-group"><p class="meal-group-name">${x.recipe ? `<a href="#/recipe/${encodeURIComponent(x.recipe)}">${esc(x.group)}</a>` : esc(x.group)}</p><ul>${x.items.map(itemHtml).join('')}</ul></div>`
      : `<ul>${itemHtml(x)}</ul>`)).join('');
  }

  function barHtml(label, value, target, unit) {
    const pct = target ? value / target : 0;
    const state = pct > 1.08 && label !== 'Protein' ? 'over' : pct < 0.85 ? 'under' : 'ok';
    return `<div class="bar ${state}">
      <div class="bar-top"><span>${label}</span><b>${Math.round(value).toLocaleString('en-GB')}${unit}<small> / ${target.toLocaleString('en-GB')}${unit}</small></b></div>
      <div class="bar-track"><i style="width:${Math.min(100, pct * 100).toFixed(1)}%"></i></div>
    </div>`;
  }

  const totalsHtml = (t, T) => barHtml('Kcal', t[0], T.calories, '') + barHtml('Protein', t[1], T.protein, ' g') + barHtml('Carbs', t[2], T.carbs, ' g') + barHtml('Fat', t[3], T.fat, ' g') +
    `<p class="fibre">Fibre ${Math.round(t[4])} g</p>`;

  function pickWeek(start) {
    const weeks = [...(PLANS.weeks || [])].sort((a, b) => a.start.localeCompare(b.start));
    if (!weeks.length) return { weeks, week: null };
    if (start) return { weeks, week: weeks.find((w) => w.start === start) || null };
    const today = todayIso();
    const end = (w) => w.days[w.days.length - 1].date;
    return { weeks, week: weeks.find((w) => w.start <= today && end(w) >= today) || weeks.find((w) => w.start > today) || weeks[weeks.length - 1] };
  }

  function renderPlan(start) {
    document.title = "Meal plan · Katerina's Kitchen";
    const { weeks, week } = pickWeek(start);
    if (!week) { app.innerHTML = `<section class="plan"><p class="empty">No meal plan yet.</p></section>`; return; }
    const T = PLANS.targets;
    const idx = weeks.indexOf(week), prev = weeks[idx - 1], next = weeks[idx + 1];
    const totals = week.days.map(dayTotals);
    const avg = MKEYS.map((_, n) => totals.reduce((s, t) => s + t[n], 0) / totals.length);
    const today = todayIso();
    const last = week.days[week.days.length - 1].date;
    app.innerHTML = `
      <section class="plan">
        <div class="plan-head">
          <div>
            <p class="eyebrow">Meal plan</p>
            <h1>${esc(week.start.slice(0, 7) === last.slice(0, 7) ? String(parseDate(week.start).getDate()) : fmtShort(week.start))} to ${esc(fmtShort(last))}</h1>
          </div>
          <nav class="week-nav" aria-label="Weeks">
            ${prev ? `<a class="link-underline" href="#/plan/${prev.start}">← Previous week</a>` : ''}
            ${next ? `<a class="link-underline" href="#/plan/${next.start}">Next week →</a>` : ''}
          </nav>
        </div>
        <section class="plan-summary" aria-label="Daily average this week">
          <p class="plan-summary-title">Daily average<span>Target ${T.calories.toLocaleString('en-GB')} kcal · ${T.protein} g protein · ${T.carbs} g carbs · ${T.fat} g fat</span></p>
          <div class="plan-summary-bars">${totalsHtml(avg, T)}</div>
        </section>
        <div class="days">
          ${week.days.map((d, n) => `
            <article class="day${d.date === today ? ' is-today' : ''}" id="day-${d.date}">
              <header class="day-head">
                <h2>${esc(fmtDay(d.date))}</h2>
                <p>${esc(fmtShort(d.date))}${d.date === today ? ' · <strong>Today</strong>' : ''}</p>
              </header>
              <div class="day-meals">
                ${MEALS.map(([k, label]) => `<section class="meal"><h3>${label}</h3>${mealHtml(d.meals[k])}</section>`).join('')}
                ${d.prep ? `<p class="prep"><b>Prep</b>${esc(d.prep)}</p>` : ''}
              </div>
              <div class="day-totals">${totalsHtml(totals[n], T)}</div>
            </article>`).join('')}
        </div>
        ${PLANS.note ? `<p class="plan-note">${esc(PLANS.note)}</p>` : ''}
      </section>`;
    const t = document.getElementById(`day-${today}`);
    if (t && !start) t.scrollIntoView({ block: 'start' });
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    document.title = "Katerina's Kitchen · Recipe Book";
    const onPlan = hash.startsWith('plan');
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const active = a.dataset.nav === (onPlan ? 'plan' : 'recipes');
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (hash.startsWith('recipe/')) renderRecipe(decodeURIComponent(hash.slice(7)));
    else if (onPlan) renderPlan(hash.split('/')[1] || '');
    else renderList();
  }

  app.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) { selectCategory(chip.dataset.cat); return; }
    const card = e.target.closest('.cat-card');
    if (card && !card.classList.contains('is-empty')) {
      selectCategory(card.dataset.cat);
      document.getElementById('recipes').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  });

  searchInput.addEventListener('input', () => {
    if (!document.getElementById('grid')) { location.hash = '#/recipes'; return; }
    document.getElementById('grid').innerHTML = gridHtml();
    if (!location.hash.includes('recipes')) document.getElementById('recipes')?.scrollIntoView({ block: 'start' });
  });

  window.addEventListener('hashchange', route);

  const getJson = (url) => fetch(url, { cache: 'no-cache' }).then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); });
  Promise.all([getJson('data/recipes.json'), getJson('data/plans.json').catch(() => ({ weeks: [] }))])
    .then(([d, p]) => {
      DATA = d;
      PLANS = p;
      route();
    })
    .catch(() => { app.innerHTML = '<section class="recipe"><p class="empty">Could not load the recipes file.</p></section>'; });
})();
