
  /* =========================================================
     STATE
  ========================================================= */
  let entries   = JSON.parse(localStorage.getItem('ts_entries')   || '[]');
  let companies = JSON.parse(localStorage.getItem('ts_companies') || '["Acme Corp","Freelance Client","Internal"]');
  let timerInterval = null;
  let timerStart    = null;
  let timerMeta     = {};

  const BAR_COLORS = ['#185FA5','#0F6E56','#BA7517','#993556','#533AB7','#993C1D'];

  /* =========================================================
     PERSISTENCE
  ========================================================= */
  function save() {
    localStorage.setItem('ts_entries',   JSON.stringify(entries));
    localStorage.setItem('ts_companies', JSON.stringify(companies));
  }

  /* =========================================================
     HELPERS
  ========================================================= */
  function fmtDur(mins) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }

  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hh = parseInt(h);
    return (hh % 12 || 12) + ':' + m + ' ' + (hh >= 12 ? 'PM' : 'AM');
  }

  function dur(s, e) {
    if (!s || !e) return 0;
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }

  function today()      { return new Date().toISOString().slice(0, 10); }
  function weekStart()  { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
  function monthStart() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; }

  /* =========================================================
     CLOCK
  ========================================================= */
  function initClock() {
    const d = new Date();
    document.getElementById('live-clock').textContent =
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('date-display').textContent =
      d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* =========================================================
     COMPANY SELECTS
  ========================================================= */
  function populateCompanySelects() {
    const sel  = document.getElementById('inp-company');
    const fsel = document.getElementById('filter-company');
    const cur  = sel.value;
    const opts = companies.map(c => `<option value="${c}">${c}</option>`).join('');
    sel.innerHTML  = '<option value="">Select company...</option>' + opts;
    fsel.innerHTML = '<option value="">All Companies</option>'     + opts;
    if (cur) sel.value = cur;
  }

  /* =========================================================
     DEFAULTS
  ========================================================= */
  function setDefaults() {
    document.getElementById('inp-date').value = today();
    const now = new Date();
    document.getElementById('inp-start').value =
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  /* =========================================================
     ADD ENTRY
  ========================================================= */
  function addEntry() {
    const co = document.getElementById('inp-company').value;
    const pr = document.getElementById('inp-project').value.trim();
    const dt = document.getElementById('inp-date').value;
    const st = document.getElementById('inp-start').value;
    const en = document.getElementById('inp-end').value;
    const no = document.getElementById('inp-notes').value.trim();

    if (!co) { alert('Please select a company.'); return; }
    if (!dt || !st || !en) { alert('Please fill in date, start time, and end time.'); return; }
    const d = dur(st, en);
    if (d <= 0) { alert('End time must be after start time.'); return; }

    entries.unshift({ id: Date.now(), company: co, project: pr, date: dt, start: st, end: en, duration: d, notes: no });
    save();

    document.getElementById('inp-project').value = '';
    document.getElementById('inp-notes').value   = '';
    document.getElementById('inp-end').value     = '';
    renderAll();
  }

  function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    entries = entries.filter(e => e.id !== id);
    save();
    renderAll();
  }

  /* =========================================================
     TIMER
  ========================================================= */
  function startTimer() {
    const co = document.getElementById('inp-company').value;
    const pr = document.getElementById('inp-project').value.trim();
    if (!co) { alert('Please select a company first.'); return; }
    timerStart = Date.now();
    timerMeta  = { company: co, project: pr, date: today(), start: new Date().toTimeString().slice(0, 5) };
    document.getElementById('timer-desc').textContent = co + (pr ? ' — ' + pr : '');
    document.getElementById('active-timer').classList.add('show');
    document.getElementById('btn-start-timer').disabled = true;
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const sec = Math.floor((Date.now() - timerStart) / 1000);
    const h   = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m   = String(Math.floor((sec % 3600) / 60)).padStart(2, '00');
    const s   = String(sec % 60).padStart(2, '0');
    document.getElementById('timer-elapsed').textContent = h + ':' + m + ':' + s;
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    const endTime = new Date().toTimeString().slice(0, 5);
    const d = dur(timerMeta.start, endTime);
    if (d > 0) {
      entries.unshift({
        id: Date.now(), company: timerMeta.company, project: timerMeta.project,
        date: timerMeta.date, start: timerMeta.start, end: endTime, duration: d, notes: '(timer)'
      });
      save();
    }
    document.getElementById('active-timer').classList.remove('show');
    document.getElementById('btn-start-timer').disabled = false;
    renderAll();
  }

  /* =========================================================
     RENDER ENTRIES
  ========================================================= */
  function getFiltered() {
    const fc = document.getElementById('filter-company').value;
    const ff = document.getElementById('filter-from').value;
    const ft = document.getElementById('filter-to').value;
    return entries.filter(e => {
      if (fc && e.company !== fc) return false;
      if (ff && e.date < ff)       return false;
      if (ft && e.date > ft)       return false;
      return true;
    });
  }

  function renderEntries() {
    const list = getFiltered();
    const tb   = document.getElementById('entries-tbody');
    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="8"><div class="empty"><i class="ti ti-clock-off"></i>No entries found</div></td></tr>`;
      return;
    }
    tb.innerHTML = list.map(e => `
      <tr>
        <td><span class="badge blue">${e.company}</span></td>
        <td>${e.project || '—'}</td>
        <td>${e.date}</td>
        <td>${fmtTime(e.start)}</td>
        <td>${fmtTime(e.end)}</td>
        <td><strong>${fmtDur(e.duration)}</strong></td>
        <td style="color:var(--text-secondary);font-size:12px">${e.notes || '—'}</td>
        <td><button class="del-btn" onclick="deleteEntry(${e.id})"><i class="ti ti-trash"></i></button></td>
      </tr>`).join('');
  }

  /* =========================================================
     RENDER COMPANIES
  ========================================================= */
  function renderCompanies() {
    const period = document.getElementById('filter-period').value;
    let filtered = entries;
    if (period === 'today') filtered = entries.filter(e => e.date === today());
    else if (period === 'week')  filtered = entries.filter(e => e.date >= weekStart());
    else if (period === 'month') filtered = entries.filter(e => e.date >= monthStart());

    const map = {};
    filtered.forEach(e => {
      if (!map[e.company]) map[e.company] = { total: 0, count: 0, last: '' };
      map[e.company].total += e.duration;
      map[e.company].count++;
      if (e.date > map[e.company].last) map[e.company].last = e.date;
    });

    const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);
    const max    = sorted.length ? sorted[0][1].total : 1;

    const chart = document.getElementById('company-chart');
    if (!sorted.length) {
      chart.innerHTML = '<div class="empty"><i class="ti ti-chart-bar"></i>No data for this period</div>';
      document.getElementById('company-tbody').innerHTML = '';
      return;
    }

    chart.innerHTML = sorted.map(([name, data], i) => `
      <div class="company-bar">
        <div class="company-bar-label" title="${name}">${name}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round(data.total / max * 100)}%;background:${BAR_COLORS[i % BAR_COLORS.length]}"></div>
        </div>
        <div class="company-bar-hrs">${fmtDur(data.total)}</div>
      </div>`).join('');

    document.getElementById('company-tbody').innerHTML = sorted.map(([name, data], i) => `
      <tr>
        <td><i class="ti ti-building" style="color:${BAR_COLORS[i % BAR_COLORS.length]};margin-right:6px"></i>${name}</td>
        <td><strong>${fmtDur(data.total)}</strong></td>
        <td>${data.count}</td>
        <td style="color:var(--text-secondary)">${data.last || '—'}</td>
      </tr>`).join('');
  }

  /* =========================================================
     RENDER STATS
  ========================================================= */
  function renderStats() {
    const todayMins = entries.filter(e => e.date === today()).reduce((s, e) => s + e.duration, 0);
    const weekMins  = entries.filter(e => e.date >= weekStart()).reduce((s, e) => s + e.duration, 0);
    const monthMins = entries.filter(e => e.date >= monthStart()).reduce((s, e) => s + e.duration, 0);
    document.getElementById('stat-today').textContent   = fmtDur(todayMins);
    document.getElementById('stat-week').textContent    = fmtDur(weekMins);
    document.getElementById('stat-month').textContent   = fmtDur(monthMins);
    document.getElementById('stat-entries').textContent = entries.length;
  }

  function renderAll() { renderEntries(); renderCompanies(); renderStats(); }

  /* =========================================================
     TABS
  ========================================================= */
  function switchTab(name, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab-entries').style.display   = name === 'entries'   ? 'block' : 'none';
    document.getElementById('tab-companies').style.display = name === 'companies' ? 'block' : 'none';
  }

  function clearFilters() {
    document.getElementById('filter-company').value = '';
    document.getElementById('filter-from').value    = '';
    document.getElementById('filter-to').value      = '';
    renderEntries();
  }

  /* =========================================================
     MANAGE COMPANIES MODAL
  ========================================================= */
  function openManageCompanies() { renderCompanyModal(); document.getElementById('modal-bg').classList.add('open'); }
  function closeModal()          { document.getElementById('modal-bg').classList.remove('open'); }
  function handleModalBgClick(e) { if (e.target === document.getElementById('modal-bg')) closeModal(); }

  function renderCompanyModal() {
    document.getElementById('company-list-modal').innerHTML =
      companies.map((c, i) => `
        <div class="company-item">
          <span>${c}</span>
          <button class="del-btn" onclick="removeCompany(${i})"><i class="ti ti-trash"></i></button>
        </div>`).join('') ||
      '<div style="font-size:13px;color:var(--text-secondary);padding:8px 0">No companies added yet.</div>';
  }

  function addCompany() {
    const v = document.getElementById('new-company-inp').value.trim();
    if (!v) return;
    if (companies.includes(v)) { alert('Company already exists.'); return; }
    companies.push(v);
    save();
    document.getElementById('new-company-inp').value = '';
    populateCompanySelects();
    renderCompanyModal();
    renderAll();
  }

  function removeCompany(i) {
    if (!confirm('Remove "' + companies[i] + '"?')) return;
    companies.splice(i, 1);
    save();
    populateCompanySelects();
    renderCompanyModal();
    renderAll();
  }

  /* =========================================================
     INIT
  ========================================================= */
  populateCompanySelects();
  setDefaults();
  initClock();
  setInterval(initClock, 1000);
  renderAll();
