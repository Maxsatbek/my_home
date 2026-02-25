/**
 * PKB 2.0 — Personal Knowledge Base
 * Vanilla JS, no dependencies
 */

'use strict';

/* ═══════════════════════════════════════════════════
   STATE & CONSTANTS
═══════════════════════════════════════════════════ */
const LS_KEY = 'pkb2_data';
const LS_UI  = 'pkb2_ui';

let DB = { sections: [], settings: { darkMode: true, sidebarCollapsed: false, spacedRepetitionDays: 3 } };
let UI = {
  view: 'home',
  activeSectionId: null,
  activeTopicId: null,
  activeTab: 'notes',
  sidebarCollapsed: false,
  examConfig: { sectionId: null, count: 10 },
  examState: null,   // { questions, current, answers, score }
  editingNotes: false,
  searchQuery: '',
  tagFilter: null,
};

/* ═══════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  loadUIState();
  applyTheme();
  bindGlobalEvents();
  render();
});

async function loadData() {
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    try { DB = JSON.parse(stored); return; } catch(e) { /* fall through */ }
  }
  // Load default data.json
  try {
    const res = await fetch('data.json');
    DB = await res.json();
    saveDB();
  } catch(e) {
    DB = { sections: [], settings: { darkMode: true, sidebarCollapsed: false, spacedRepetitionDays: 3 } };
  }
}

function saveDB() { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }

function loadUIState() {
  const s = localStorage.getItem(LS_UI);
  if (s) { try { Object.assign(UI, JSON.parse(s)); } catch(e){} }
  // Reset transient state
  UI.examState = null;
  UI.editingNotes = false;
  UI.searchQuery = '';
}

function saveUIState() {
  const { view, activeSectionId, activeTopicId, activeTab, sidebarCollapsed } = UI;
  localStorage.setItem(LS_UI, JSON.stringify({ view, activeSectionId, activeTopicId, activeTab, sidebarCollapsed }));
}

function applyTheme() {
  const dark = DB.settings?.darkMode !== false;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = $('btnTheme');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
}

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const uid = () => '_' + Date.now().toString(36) + Math.random().toString(36).substr(2,5);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const isOverdue = d => d && new Date(d) < new Date();
const shuffle = arr => { const a = [...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

function notify(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.style.opacity = '0', 2200);
  setTimeout(() => el.remove(), 2500);
}

function ce(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k,v]) => {
    if (k === 'cls') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

/* ─── DATA FINDERS ─── */
const findSection = id => DB.sections.find(s => s.id === id);
const findTopic   = (sid, tid) => findSection(sid)?.topics?.find(t => t.id === tid);
function findTopicGlobal(tid) {
  for (const s of DB.sections) {
    const t = s.topics?.find(t => t.id === tid);
    if (t) return { section: s, topic: t };
  }
  return null;
}

/* ─── STATS ─── */
function globalStats() {
  let sections = DB.sections.length, topics = 0, done = 0, tests = 0, totalScore = 0, attempts = 0;
  DB.sections.forEach(s => {
    (s.topics||[]).forEach(t => {
      topics++;
      if (t.status === 'done') done++;
      (t.tests||[]).forEach(q => {
        tests++;
        (q.history||[]).forEach(h => { totalScore += h.correct?1:0; attempts++; });
      });
    });
  });
  const avgScore = attempts > 0 ? Math.round((totalScore / attempts) * 100) : null;
  return { sections, topics, done, tests, avgScore };
}

function sectionProgress(section) {
  const topics = section.topics || [];
  if (!topics.length) return 0;
  return Math.round(topics.filter(t => t.status === 'done').length / topics.length * 100);
}

function sectionAvgScore(section) {
  let total = 0, count = 0;
  (section.topics||[]).forEach(t => {
    (t.tests||[]).forEach(q => {
      (q.history||[]).forEach(h => { total += h.correct?1:0; count++; });
    });
  });
  return count > 0 ? Math.round(total / count * 100) : null;
}

function getRepetitionList() {
  const days = DB.settings?.spacedRepetitionDays || 3;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const items = [];
  DB.sections.forEach(s => {
    (s.topics||[]).forEach(t => {
      const lastR = t.lastReview ? new Date(t.lastReview) : null;
      const needsReview = t.status !== 'done' || (lastR && lastR < cutoff) || t.isDifficult;
      if (needsReview) items.push({ section: s, topic: t });
    });
  });
  items.sort((a,b) => {
    const da = a.topic.lastReview ? new Date(a.topic.lastReview) : new Date(0);
    const db = b.topic.lastReview ? new Date(b.topic.lastReview) : new Date(0);
    return da - db;
  });
  return items;
}

/* ═══════════════════════════════════════════════════
   MARKDOWN RENDERER (mini)
═══════════════════════════════════════════════════ */
function renderMd(src) {
  if (!src || !src.trim()) return `<span class="notes-empty">Нет заметок. Нажмите «Редактировать» для добавления.</span>`;
  let s = src;
  // Escape HTML
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Fenced code blocks
  s = s.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`);
  // Inline code
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Table (basic)
  s = s.replace(/^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, body) => {
    const heads = header.split('|').map(h => `<th>${h.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(r => {
      const cells = r.split('|').filter((_,i,a)=>i>0&&i<a.length-1).map(c=>`<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // H1-H3
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  // Blockquote
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // HR
  s = s.replace(/^---$/gm, '<hr>');
  // Bold/italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Unordered list
  s = s.replace(/(^[-*] .+\n?)+/gm, m => `<ul>${m.replace(/^[-*] (.+)$/gm, '<li>$1</li>')}</ul>`);
  // Ordered list
  s = s.replace(/(^\d+\. .+\n?)+/gm, m => `<ol>${m.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')}</ol>`);
  // Links
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Paragraphs (split on double newline)
  s = s.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|pre|blockquote|table|hr)/.test(block)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return s;
}

/* ═══════════════════════════════════════════════════
   RENDER ENGINE
═══════════════════════════════════════════════════ */
function render() {
  renderTopbar();
  renderSidebar();
  renderContent();
  renderStatsPanel();
  saveUIState();
}

function renderTopbar() {
  const sbToggle = $('btnSidebar');
  if (sbToggle) sbToggle.innerHTML = UI.sidebarCollapsed ? '▶' : '◀';
  const searchEl = $('searchInput');
  if (searchEl && document.activeElement !== searchEl) searchEl.value = UI.searchQuery;
}

/* ─── SIDEBAR ─── */
function renderSidebar() {
  const sidebar = $('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed', UI.sidebarCollapsed);
  const list = $('sectionsList');
  if (!list) return;
  list.innerHTML = '';
  DB.sections.forEach(section => renderSidebarSection(section, list));
}

function renderSidebarSection(section, container) {
  const isExpanded = !section._collapsed;
  const item = ce('div', { cls: 'section-item' });

  const row = ce('div', {
    cls: `section-row ${UI.activeSectionId === section.id && UI.view === 'section' ? 'active' : ''}`,
  });
  row.addEventListener('click', e => {
    if (e.target.closest('.section-actions')) return;
    if (UI.activeSectionId === section.id) {
      section._collapsed = !section._collapsed;
    } else {
      UI.activeSectionId = section.id;
      UI.view = 'section';
      UI.activeTopicId = null;
      section._collapsed = false;
    }
    render();
  });

  const chevron = ce('span', { cls: `section-chevron ${isExpanded ? 'open' : ''}` }, '▶');
  const icon = ce('span', { cls: 'section-icon' }, section.icon || '📁');
  const name = ce('span', { cls: 'section-name' }, section.title);
  const count = ce('span', { cls: 'section-count' }, String((section.topics||[]).length));
  const actions = ce('span', { cls: 'section-actions' });

  const editBtn = ce('button', { cls: 'ibtn', title: 'Редактировать', onclick: e => { e.stopPropagation(); openSectionModal(section.id); } }, '✏️');
  const delBtn  = ce('button', { cls: 'ibtn danger', title: 'Удалить', onclick: e => { e.stopPropagation(); deleteSection(section.id); } }, '🗑️');
  actions.append(editBtn, delBtn);
  row.append(chevron, icon, name, count, actions);
  item.appendChild(row);

  if (isExpanded) {
    const topicsDiv = ce('div', { cls: 'topics-list' });
    (section.topics||[]).forEach(topic => {
      const dot = ce('span', { cls: 'topic-status-dot' });
      dot.style.background = statusColor(topic.status);
      const tItem = ce('div', {
        cls: `topic-item ${UI.activeTopicId === topic.id ? 'active' : ''}`,
        onclick: () => { UI.activeSectionId = section.id; UI.activeTopicId = topic.id; UI.view = 'topic'; UI.activeTab = 'notes'; render(); }
      }, dot, ce('span', { cls: 'topic-item-name' }, topic.title));
      topicsDiv.appendChild(tItem);
    });
    item.appendChild(topicsDiv);
  }
  container.appendChild(item);
}

function statusColor(s) {
  return s === 'done' ? '#34d399' : s === 'review' ? '#fbbf24' : '#60a5fa';
}

/* ─── MAIN CONTENT ─── */
function renderContent() {
  const content = $('content');
  if (!content) return;

  // Hide all views
  $$('.view').forEach(v => v.classList.remove('active'));

  switch (UI.view) {
    case 'home':        renderHome();       break;
    case 'section':     renderSectionView();break;
    case 'topic':       renderTopicView();  break;
    case 'exam':        renderExamView();   break;
    case 'repetition':  renderRepetitionView(); break;
    case 'search':      renderSearchView(); break;
    default:            renderHome();
  }
}

/* ─── HOME ─── */
function renderHome() {
  let view = $('viewHome');
  if (!view) {
    view = ce('div', { id: 'viewHome', cls: 'view' });
    $('content').appendChild(view);
  }
  view.classList.add('active');
  const stats = globalStats();

  view.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Главная</div>
        <div class="view-subtitle">Добро пожаловать в вашу базу знаний</div>
      </div>
      <div class="view-actions">
        <button class="btn btn-secondary btn-sm" id="btnExportHome">⬆ Экспорт</button>
        <button class="btn btn-secondary btn-sm" id="btnImportHome">⬇ Импорт</button>
        <button class="btn btn-secondary btn-sm" id="btnResetHome">↺ Сброс</button>
        <button class="btn btn-primary" id="btnAddSectionHome">+ Раздел</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Разделов</div>
        <div class="stat-value" style="color:var(--accent-hover)">${stats.sections}</div>
        <div class="stat-detail">категорий</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Тем</div>
        <div class="stat-value" style="color:var(--purple-text)">${stats.topics}</div>
        <div class="stat-detail">${stats.done} освоено</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Вопросов</div>
        <div class="stat-value" style="color:var(--teal-text)">${stats.tests}</div>
        <div class="stat-detail">в тестах</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Средний балл</div>
        <div class="stat-value" style="color:${stats.avgScore===null?'var(--text-muted)':stats.avgScore>=70?'var(--green-text)':'var(--amber-text)'}">${stats.avgScore !== null ? stats.avgScore + '%' : '—'}</div>
        <div class="stat-detail">по тестам</div>
      </div>
    </div>

    <div class="section-heading">Разделы</div>
    <div class="section-cards" id="homeCards"></div>
  `;

  // Section cards
  const cards = $('homeCards');
  if (!DB.sections.length) {
    cards.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">Нет разделов</div><div class="empty-desc">Создайте первый раздел, чтобы начать</div></div>`;
  } else {
    DB.sections.forEach(s => {
      const prog = sectionProgress(s);
      const avg  = sectionAvgScore(s);
      const card = ce('div', { cls: 'section-card', 'data-sid': s.id });
      card.style.setProperty('--card-color', s.color || 'var(--accent)');
      card.innerHTML = `
        <div class="section-card-head">
          <span class="section-card-icon">${s.icon || '📁'}</span>
          <div style="display:flex;gap:4px">
            <button class="ibtn" data-edit-section="${s.id}">✏️</button>
            <button class="ibtn danger" data-del-section="${s.id}">🗑️</button>
          </div>
        </div>
        <div class="section-card-title">${esc(s.title)}</div>
        <div class="section-card-desc">${esc(s.description || '')}</div>
        <div class="section-card-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;background:${s.color||'var(--accent)'}"></div></div>
        </div>
        <div class="section-card-footer">
          <span>${(s.topics||[]).filter(t=>t.status==='done').length}/${(s.topics||[]).length} освоено</span>
          <span>${avg !== null ? avg + '% балл' : ''}</span>
          <span>${prog}%</span>
        </div>
      `;
      card.addEventListener('click', e => {
        if (e.target.closest('[data-edit-section]') || e.target.closest('[data-del-section]')) return;
        UI.activeSectionId = s.id; UI.view = 'section'; render();
      });
      card.querySelector(`[data-edit-section="${s.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); openSectionModal(s.id); });
      card.querySelector(`[data-del-section="${s.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); deleteSection(s.id); });
      cards.appendChild(card);
    });
  }

  $('btnAddSectionHome')?.addEventListener('click', () => openSectionModal());
  $('btnExportHome')?.addEventListener('click', exportData);
  $('btnImportHome')?.addEventListener('click', importData);
  $('btnResetHome')?.addEventListener('click', resetData);
}

/* ─── SECTION VIEW ─── */
function renderSectionView() {
  const section = findSection(UI.activeSectionId);
  if (!section) { UI.view = 'home'; renderHome(); return; }

  let view = $('viewSection');
  if (!view) { view = ce('div', { id: 'viewSection', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');

  const prog = sectionProgress(section);
  const avg  = sectionAvgScore(section);

  view.innerHTML = `
    <div class="view-header">
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;cursor:pointer" id="backHome">← Главная</div>
        <div class="view-title">${esc(section.icon||'📁')} ${esc(section.title)}</div>
        <div class="view-subtitle">${esc(section.description||'')} &nbsp;·&nbsp; ${prog}% освоено${avg!==null?` · Средний балл: ${avg}%`:''}</div>
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="btnAddTopic">+ Тема</button>
        <button class="btn btn-secondary" id="btnExamSection">🎓 Экзамен</button>
      </div>
    </div>

    <div class="mb-12" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">
      <div class="progress-fill" style="height:5px;width:${prog}%;background:${section.color||'var(--accent)'}"></div>
    </div>

    <div class="topics-grid" id="topicsGrid"></div>
  `;

  $('backHome')?.addEventListener('click', () => { UI.view = 'home'; render(); });
  $('btnAddTopic')?.addEventListener('click', () => openTopicModal());
  $('btnExamSection')?.addEventListener('click', () => { UI.view = 'exam'; UI.examConfig.sectionId = section.id; UI.examState = null; render(); });

  const grid = $('topicsGrid');
  const topics = section.topics || [];
  if (!topics.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">Нет тем</div><div class="empty-desc">Добавьте первую тему в этот раздел</div></div>`;
    return;
  }

  topics.forEach(topic => {
    const card = ce('div', { cls: 'topic-card' });
    card.innerHTML = `
      <div class="topic-card-actions">
        <button class="ibtn" data-edit-topic="${topic.id}">✏️</button>
        <button class="ibtn danger" data-del-topic="${topic.id}">🗑️</button>
      </div>
      <div class="topic-card-title">${esc(topic.title)}</div>
      <div class="topic-card-meta">
        ${statusBadge(topic.status)}
        ${priorityBadge(topic.priority)}
        ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложно</span>' : ''}
        ${difficultyStars(topic.difficulty)}
      </div>
      <div class="topic-card-footer">
        <span style="display:flex;gap:4px;flex-wrap:wrap">${(topic.tags||[]).map(t=>`<span class="badge badge-tag">#${esc(t)}</span>`).join('')}</span>
        <span>${(topic.tests||[]).length} вопр.</span>
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.closest('[data-edit-topic]') || e.target.closest('[data-del-topic]')) return;
      UI.activeTopicId = topic.id; UI.view = 'topic'; UI.activeTab = 'notes'; render();
    });
    card.querySelector(`[data-edit-topic="${topic.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); openTopicModal(topic.id); });
    card.querySelector(`[data-del-topic="${topic.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); deleteTopic(UI.activeSectionId, topic.id); });
    grid.appendChild(card);
  });
}

/* ─── TOPIC VIEW ─── */
function renderTopicView() {
  const res = findTopicGlobal(UI.activeTopicId);
  if (!res) { UI.view = 'home'; renderHome(); return; }
  const { section, topic } = res;

  let view = $('viewTopic');
  if (!view) { view = ce('div', { id: 'viewTopic', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');

  const deadlineClass = isOverdue(topic.deadline) ? 'overdue' : '';

  view.innerHTML = `
    <div class="topic-detail-header">
      <div class="topic-breadcrumb">
        <span style="cursor:pointer;color:var(--text-link)" id="backToSection">← ${esc(section.title)}</span>
      </div>
      <div class="topic-detail-title">${esc(topic.title)}</div>
      <div class="topic-detail-meta">
        ${statusBadge(topic.status)}
        ${priorityBadge(topic.priority)}
        ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложная</span>' : ''}
        ${difficultyStars(topic.difficulty)}
        ${(topic.tags||[]).map(t=>`<span class="badge badge-tag">#${esc(t)}</span>`).join('')}
      </div>
      <div class="topic-dates">
        <span class="topic-date-item">Повторение: <span>${fmtDate(topic.lastReview)}</span></span>
        ${topic.deadline ? `<span class="topic-date-item ${deadlineClass}">Дедлайн: <span class="${deadlineClass}">${fmtDate(topic.deadline)}</span></span>` : ''}
      </div>
    </div>

    <div class="view-actions mb-12" style="justify-content:flex-start">
      <button class="btn btn-secondary btn-sm" id="btnEditTopic">✏️ Редактировать тему</button>
      <button class="btn btn-secondary btn-sm" id="btnMarkReviewed">✅ Отметить повторённой</button>
      <button class="btn btn-secondary btn-sm" id="btnToggleDifficult">${topic.isDifficult ? '✓ Снять «Сложно»' : '⚠ Отметить сложной'}</button>
    </div>

    <div class="tab-nav">
      <button class="tab-btn ${UI.activeTab==='notes'?'active':''}" data-tab="notes">📝 Заметки</button>
      <button class="tab-btn ${UI.activeTab==='links'?'active':''}" data-tab="links">🔗 Ссылки (${(topic.links||[]).length})</button>
      <button class="tab-btn ${UI.activeTab==='tests'?'active':''}" data-tab="tests">❓ Тесты (${(topic.tests||[]).length})</button>
    </div>

    <div id="tabPanels"></div>
  `;

  $('backToSection')?.addEventListener('click', () => { UI.activeSectionId = section.id; UI.view = 'section'; render(); });
  $('btnEditTopic')?.addEventListener('click', () => openTopicModal(topic.id));
  $('btnMarkReviewed')?.addEventListener('click', () => {
    topic.lastReview = today();
    if (topic.status === 'learning') topic.status = 'review';
    saveDB(); notify('Отмечено как повторённое', 'success'); render();
  });
  $('btnToggleDifficult')?.addEventListener('click', () => {
    topic.isDifficult = !topic.isDifficult;
    saveDB(); notify(topic.isDifficult ? 'Отмечено как сложная' : 'Метка снята', 'success'); render();
  });

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => { UI.activeTab = btn.dataset.tab; render(); });
  });

  renderTabPanel(section, topic);
}

function renderTabPanel(section, topic) {
  const panels = $('tabPanels');
  if (!panels) return;
  panels.innerHTML = '';

  if (UI.activeTab === 'notes')  renderNotesPanel(topic, panels);
  if (UI.activeTab === 'links')  renderLinksPanel(section, topic, panels);
  if (UI.activeTab === 'tests')  renderTestsPanel(section, topic, panels);
}

/* ─── NOTES PANEL ─── */
function renderNotesPanel(topic, container) {
  const panel = ce('div', { cls: 'tab-panel active' });
  panel.innerHTML = `
    <div class="notes-toolbar">
      ${!UI.editingNotes ? `<button class="btn btn-secondary btn-sm" id="btnEditNotes">✏️ Редактировать</button>` : ''}
    </div>
    <div class="notes-container">
      <div class="notes-display md" id="notesDisplay"></div>
      <div class="notes-editor-wrap ${UI.editingNotes?'visible':''}" id="notesEditorWrap">
        <textarea id="notesTextarea" placeholder="# Заголовок&#10;&#10;Поддерживает **Markdown**: *курсив*, \`код\`, \`\`\`блок кода\`\`\`, > цитата, - список"></textarea>
        <div class="notes-editor-actions">
          <button class="btn btn-ghost btn-sm" id="btnCancelNotes">Отмена</button>
          <button class="btn btn-primary btn-sm" id="btnSaveNotes">💾 Сохранить</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(panel);

  $('notesDisplay').innerHTML = renderMd(topic.notes || '');

  if (UI.editingNotes) {
    const ta = $('notesTextarea');
    if (ta) { ta.value = topic.notes || ''; ta.focus(); }
  }

  $('btnEditNotes')?.addEventListener('click', () => { UI.editingNotes = true; render(); });
  $('btnCancelNotes')?.addEventListener('click', () => { UI.editingNotes = false; render(); });
  $('btnSaveNotes')?.addEventListener('click', () => {
    topic.notes = $('notesTextarea').value;
    saveDB(); UI.editingNotes = false;
    notify('Заметки сохранены', 'success'); render();
  });
}

/* ─── LINKS PANEL ─── */
function renderLinksPanel(section, topic, container) {
  const panel = ce('div', { cls: 'tab-panel active' });
  panel.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" id="btnAddLink">+ Ссылка</button>
    </div>
    <div class="links-list" id="linksList"></div>
  `;
  container.appendChild(panel);

  $('btnAddLink')?.addEventListener('click', () => openLinkModal(section.id, topic.id));

  const list = $('linksList');
  const links = topic.links || [];
  if (!links.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">Нет ссылок</div></div>`;
    return;
  }
  links.forEach(link => {
    const isYT = link.url?.includes('youtube') || link.url?.includes('youtu.be');
    const card = ce('div', { cls: 'link-card' });
    card.innerHTML = `
      <span class="link-favicon">${isYT ? '▶️' : '🌐'}</span>
      <div class="link-info">
        <div class="link-title">${esc(link.title)}</div>
        <div class="link-url">${esc(link.url)}</div>
        ${link.note ? `<div class="link-note">${esc(link.note)}</div>` : ''}
      </div>
      <div class="link-actions">
        <a href="${esc(link.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Открыть ↗</a>
        <button class="ibtn btn-edit-link" data-lid="${link.id}">✏️</button>
        <button class="ibtn danger btn-del-link" data-lid="${link.id}">🗑️</button>
      </div>
    `;
    card.querySelector(`[data-lid="${link.id}"].btn-edit-link`)?.addEventListener('click', () => openLinkModal(section.id, topic.id, link.id));
    card.querySelector(`[data-lid="${link.id}"].btn-del-link`)?.addEventListener('click', () => {
      if (!confirm('Удалить ссылку?')) return;
      topic.links = links.filter(l => l.id !== link.id);
      saveDB(); notify('Ссылка удалена'); render();
    });
    list.appendChild(card);
  });
}

/* ─── TESTS PANEL ─── */
function renderTestsPanel(section, topic, container) {
  const panel = ce('div', { cls: 'tab-panel active' });
  panel.innerHTML = `
    <div class="tests-toolbar">
      <button class="btn btn-success btn-sm" id="btnRunTests">▶ Пройти тест</button>
      <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
    </div>
    <div class="tests-list" id="testsList"></div>
  `;
  container.appendChild(panel);

  $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
  $('btnRunTests')?.addEventListener('click', () => {
    // Run inline quiz — reset all questions
    $$('.test-option').forEach(o => {
      o.disabled = false;
      o.className = 'test-option';
    });
    $$('.test-explanation').forEach(e => e.classList.remove('visible'));
    notify('Тест сброшен — отвечайте на вопросы!', 'info');
  });

  const list = $('testsList');
  const tests = topic.tests || [];
  if (!tests.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-title">Нет вопросов</div><div class="empty-desc">Добавьте вопросы для самопроверки</div></div>`;
    return;
  }

  tests.forEach(q => {
    const card = ce('div', { cls: 'test-card', id: `tc_${q.id}` });
    const history = q.history || [];
    const lastAttempts = history.slice(-5);
    const shuffledIdx = shuffle([0,1,2,3]);
    const displayOptions = shuffledIdx.map(i => ({ text: q.options[i], origIdx: i }));
    const newCorrectIdx = displayOptions.findIndex(o => o.origIdx === q.correct);

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="test-question">${esc(q.question)}</div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button class="ibtn btn-edit-test" data-qid="${q.id}">✏️</button>
          <button class="ibtn danger btn-del-test" data-qid="${q.id}">🗑️</button>
        </div>
      </div>
      <div class="test-options" id="opts_${q.id}"></div>
      <div class="test-explanation" id="expl_${q.id}">${esc(q.explanation || '')}</div>
      <div class="test-footer">
        <div class="test-history">
          ${lastAttempts.map(a => `<span class="test-attempt ${a.correct?'pass':'fail'}">${a.correct?'✓':'✗'}</span>`).join('')}
        </div>
        <span class="text-muted text-sm">${history.length > 0 ? Math.round(history.filter(h=>h.correct).length/history.length*100)+'% верно' : 'Нет попыток'}</span>
      </div>
    `;

    const optsDiv = card.querySelector(`#opts_${q.id}`);
    displayOptions.forEach((opt, dispIdx) => {
      const letters = ['A','B','C','D'];
      const btn = ce('button', { cls: 'test-option' });
      btn.innerHTML = `<span class="test-opt-letter">${letters[dispIdx]}</span><span class="test-opt-text">${esc(opt.text)}</span>`;
      btn.addEventListener('click', () => {
        // Disable all options
        optsDiv.querySelectorAll('.test-option').forEach((b, i) => {
          b.disabled = true;
          if (i === newCorrectIdx) b.classList.add('correct');
        });
        if (dispIdx !== newCorrectIdx) btn.classList.add('wrong');
        const correct = dispIdx === newCorrectIdx;
        // Save history
        if (!q.history) q.history = [];
        q.history.push({ date: today(), correct });
        saveDB();
        // Show explanation
        const expl = card.querySelector(`#expl_${q.id}`);
        if (expl && q.explanation) expl.classList.add('visible');
      });
      optsDiv.appendChild(btn);
    });

    card.querySelector(`.btn-edit-test[data-qid="${q.id}"]`)?.addEventListener('click', () => openTestModal(section.id, topic.id, q.id));
    card.querySelector(`.btn-del-test[data-qid="${q.id}"]`)?.addEventListener('click', () => {
      if (!confirm('Удалить вопрос?')) return;
      topic.tests = tests.filter(t => t.id !== q.id);
      saveDB(); notify('Вопрос удалён'); render();
    });

    list.appendChild(card);
  });
}

/* ─── EXAM VIEW ─── */
function renderExamView() {
  let view = $('viewExam');
  if (!view) { view = ce('div', { id: 'viewExam', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');

  if (!UI.examState) {
    renderExamSetup(view);
  } else if (UI.examState.finished) {
    renderExamResult(view);
  } else {
    renderExamQuestion(view);
  }
}

function renderExamSetup(view) {
  const counts = [5, 10, 15, 20];
  view.innerHTML = `
    <div class="view-header">
      <div><div class="view-title">🎓 Экзамен</div><div class="view-subtitle">Проверьте свои знания</div></div>
      <button class="btn btn-ghost btn-sm" id="backFromExam">← Назад</button>
    </div>
    <div class="exam-container">
      <div class="exam-setup-card">
        <div class="exam-setup-icon">🎓</div>
        <div class="exam-setup-title">Настройка экзамена</div>
        <div class="exam-setup-desc">Выберите раздел и количество вопросов</div>
        <div class="mb-16" style="text-align:left">
          <div class="form-group">
            <label class="form-label">Раздел</label>
            <select class="form-select" id="examSection">
              <option value="">Все разделы</option>
              ${DB.sections.map(s => `<option value="${s.id}" ${UI.examConfig.sectionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="exam-options-row">
          ${counts.map(n => `<div class="exam-option-card ${UI.examConfig.count===n?'selected':''}" data-count="${n}"><div class="exam-option-n">${n}</div><div class="exam-option-label">вопросов</div></div>`).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:14px;padding:12px" id="btnStartExam">Начать экзамен →</button>
      </div>
    </div>
  `;

  $('backFromExam')?.addEventListener('click', () => { UI.view = UI.activeSectionId ? 'section' : 'home'; render(); });
  $('examSection')?.addEventListener('change', e => { UI.examConfig.sectionId = e.target.value || null; });
  $$('.exam-option-card').forEach(c => {
    c.addEventListener('click', () => {
      $$('.exam-option-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      UI.examConfig.count = parseInt(c.dataset.count);
    });
  });
  $('btnStartExam')?.addEventListener('click', startExam);
}

function collectExamQuestions() {
  const sections = UI.examConfig.sectionId
    ? DB.sections.filter(s => s.id === UI.examConfig.sectionId)
    : DB.sections;
  const allQ = [];
  sections.forEach(s => {
    (s.topics||[]).forEach(t => {
      (t.tests||[]).forEach(q => allQ.push({ ...q, _topicTitle: t.title, _sectionTitle: s.title, _topicId: t.id, _sectionId: s.id }));
    });
  });
  return shuffle(allQ).slice(0, UI.examConfig.count);
}

function startExam() {
  const questions = collectExamQuestions();
  if (!questions.length) { notify('Нет доступных вопросов в этом разделе', 'warning'); return; }
  UI.examState = {
    questions,
    current: 0,
    answers: new Array(questions.length).fill(null),
    shuffledOpts: questions.map(q => {
      const idx = shuffle([0,1,2,3]);
      return { shuffledIdx: idx, newCorrect: idx.findIndex(i => i === q.correct) };
    }),
    revealed: new Array(questions.length).fill(false),
    finished: false,
    score: 0,
  };
  render();
}

function renderExamQuestion(view) {
  const es = UI.examState;
  const qi = es.current;
  const q = es.questions[qi];
  const total = es.questions.length;
  const answered = es.answers[qi] !== null;
  const { shuffledIdx, newCorrect } = es.shuffledOpts[qi];
  const opts = shuffledIdx.map(i => q.options[i]);
  const letters = ['A','B','C','D'];

  view.innerHTML = `
    <div class="view-header" style="margin-bottom:8px">
      <div><div class="view-title">🎓 Экзамен</div></div>
      <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
    </div>
    <div class="exam-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="exam-qnum">${q._sectionTitle} · ${q._topicTitle}</span>
        <span class="exam-qnum">Вопрос ${qi+1} / ${total}</span>
      </div>
      <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${((qi+1)/total*100)}%"></div></div>
      <div class="exam-question-card">
        <div class="exam-question-text">${esc(q.question)}</div>
        <div class="exam-options" id="examOpts"></div>
        ${q.explanation && es.revealed[qi] ? `<div style="margin-top:14px;padding:12px;background:var(--accent-dim);border-radius:var(--radius-md);border-left:3px solid var(--accent);font-size:12px;color:var(--text-secondary)">${esc(q.explanation)}</div>` : ''}
      </div>
      <div class="exam-nav">
        <button class="btn btn-secondary" id="btnExamPrev" ${qi===0?'disabled':''}>← Назад</button>
        ${qi < total-1
          ? `<button class="btn btn-primary" id="btnExamNext" ${!answered?'disabled':''}>Далее →</button>`
          : `<button class="btn btn-success" id="btnExamFinish" ${!answered?'disabled':''}>Завершить ✓</button>`
        }
      </div>
    </div>
  `;

  const optsDiv = $('examOpts');
  opts.forEach((opt, dispIdx) => {
    const btn = ce('button', { cls: 'exam-opt' });
    let cls = '';
    if (es.revealed[qi]) {
      if (dispIdx === newCorrect) cls = 'correct';
      else if (dispIdx === es.answers[qi] && dispIdx !== newCorrect) cls = 'wrong';
      btn.disabled = true;
    }
    btn.className = 'exam-opt ' + cls;
    if (!es.revealed[qi]) btn.disabled = false;
    btn.innerHTML = `<span class="exam-opt-letter">${letters[dispIdx]}</span>${esc(opt)}`;
    btn.addEventListener('click', () => {
      if (es.revealed[qi]) return;
      es.answers[qi] = dispIdx;
      es.revealed[qi] = true;
      if (dispIdx === newCorrect) es.score++;
      // Save history
      const origTopic = findTopic(q._sectionId, q._topicId);
      const origQ = origTopic?.tests?.find(t => t.id === q.id);
      if (origQ) {
        if (!origQ.history) origQ.history = [];
        origQ.history.push({ date: today(), correct: dispIdx === newCorrect });
        saveDB();
      }
      render();
    });
    optsDiv.appendChild(btn);
  });

  $('btnExitExam')?.addEventListener('click', () => {
    if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
  });
  $('btnExamPrev')?.addEventListener('click', () => { es.current--; render(); });
  $('btnExamNext')?.addEventListener('click', () => { es.current++; render(); });
  $('btnExamFinish')?.addEventListener('click', () => { es.finished = true; render(); });
}

function renderExamResult(view) {
  const es = UI.examState;
  const pct = Math.round(es.score / es.questions.length * 100);
  const cls = pct >= 80 ? 'score-excellent' : pct >= 50 ? 'score-good' : 'score-poor';
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖';
  view.innerHTML = `
    <div class="exam-container">
      <div class="exam-result-card">
        <div style="font-size:56px;margin-bottom:12px">${emoji}</div>
        <div class="exam-result-score ${cls}">${pct}%</div>
        <div class="exam-result-label">${es.score} из ${es.questions.length} правильно</div>
        <div class="exam-result-sub" style="margin-top:8px">${pct>=80?'Отличный результат!':pct>=50?'Хороший результат, есть над чем поработать':'Нужно повторить материал'}</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btnRetryExam">Пройти ещё раз</button>
          <button class="btn btn-secondary" id="btnExamHome">На главную</button>
        </div>
      </div>
    </div>
  `;
  $('btnRetryExam')?.addEventListener('click', () => { UI.examState = null; render(); });
  $('btnExamHome')?.addEventListener('click', () => { UI.examState = null; UI.view = 'home'; render(); });
}

/* ─── REPETITION VIEW ─── */
function renderRepetitionView() {
  let view = $('viewRep');
  if (!view) { view = ce('div', { id: 'viewRep', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');

  const items = getRepetitionList();
  view.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">🔄 К повторению</div>
        <div class="view-subtitle">Темы, требующие внимания · ${items.length} шт.</div>
      </div>
    </div>
    <div class="rep-list" id="repList"></div>
  `;

  const list = $('repList');
  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">Всё в порядке!</div><div class="empty-desc">Нет тем для повторения</div></div>`;
    return;
  }
  items.forEach(({ section, topic }) => {
    const card = ce('div', { cls: `rep-card ${topic.isDifficult?'difficult':''}` });
    card.innerHTML = `
      <div class="rep-info">
        <div class="rep-title">${esc(topic.title)}</div>
        <div class="rep-meta">
          <span>${esc(section.title)}</span>
          <span>Повторение: ${fmtDate(topic.lastReview)}</span>
          <span>${statusBadge(topic.status)}</span>
          ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложная</span>' : ''}
        </div>
      </div>
      <div class="rep-actions">
        <button class="btn btn-secondary btn-sm" data-open-topic="${topic.id}" data-open-section="${section.id}">Открыть</button>
        <button class="btn btn-success btn-xs btn-reviewed" data-tid="${topic.id}">✓ Повторено</button>
      </div>
    `;
    card.querySelector(`[data-open-topic="${topic.id}"]`)?.addEventListener('click', () => {
      UI.activeSectionId = section.id; UI.activeTopicId = topic.id; UI.view = 'topic'; render();
    });
    card.querySelector(`.btn-reviewed[data-tid="${topic.id}"]`)?.addEventListener('click', () => {
      topic.lastReview = today();
      topic.status = 'review';
      saveDB(); notify('Тема отмечена повторённой', 'success'); renderRepetitionView();
    });
    list.appendChild(card);
  });
}

/* ─── SEARCH VIEW ─── */
function renderSearchView() {
  let view = $('viewSearch');
  if (!view) { view = ce('div', { id: 'viewSearch', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');

  const q = UI.searchQuery.trim().toLowerCase();
  const results = q ? searchAll(q) : [];

  view.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">🔍 Поиск</div>
        <div class="view-subtitle">${q ? `Результаты для «${esc(UI.searchQuery)}» · ${results.length} найдено` : 'Введите запрос в строку поиска'}</div>
      </div>
    </div>
    <div class="search-results" id="searchResults"></div>
  `;

  const container = $('searchResults');
  if (!q) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Начните вводить запрос</div></div>`;
    return;
  }
  if (!results.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><div class="empty-title">Ничего не найдено</div></div>`;
    return;
  }
  results.forEach(r => {
    const item = ce('div', { cls: 'search-result-item' });
    item.innerHTML = `
      <div class="search-result-type">${r.type}</div>
      <div class="search-result-title">${highlight(r.title, q)}</div>
      <div class="search-result-ctx">${r.context ? highlight(r.context, q) : ''}</div>
    `;
    item.addEventListener('click', r.onClick);
    container.appendChild(item);
  });
}

function searchAll(q) {
  const results = [];
  DB.sections.forEach(s => {
    if (s.title.toLowerCase().includes(q)) {
      results.push({ type: 'Раздел', title: s.title, context: s.description || '', onClick: () => { UI.activeSectionId = s.id; UI.view = 'section'; render(); } });
    }
    (s.topics||[]).forEach(t => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({ type: 'Тема', title: t.title, context: s.title, onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; render(); } });
      }
      if (t.notes?.toLowerCase().includes(q)) {
        const idx = t.notes.toLowerCase().indexOf(q);
        const ctx = t.notes.slice(Math.max(0, idx-40), idx+80).replace(/\n/g,' ');
        results.push({ type: 'Заметка', title: t.title, context: '...' + ctx + '...', onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; UI.activeTab = 'notes'; render(); } });
      }
      (t.tests||[]).forEach(test => {
        if (test.question.toLowerCase().includes(q)) {
          results.push({ type: 'Вопрос теста', title: test.question, context: t.title + ' · ' + s.title, onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; UI.activeTab = 'tests'; render(); } });
        }
      });
    });
  });
  return results;
}

function highlight(text, q) {
  if (!q) return esc(text);
  const safe = esc(text);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
  return safe.replace(re, m => `<mark>${m}</mark>`);
}

/* ─── STATS PANEL ─── */
function renderStatsPanel() {
  const panel = $('statsPanel');
  if (!panel) return;
  const stats = globalStats();
  const rep = getRepetitionList().length;

  panel.innerHTML = `
    <div class="stats-panel-title">Статистика</div>

    <div class="mini-stat">
      <div class="mini-stat-label">Прогресс</div>
      <div class="mini-stat-val" style="color:var(--accent-hover)">${stats.done}<span style="font-size:14px;color:var(--text-muted)">/${stats.topics}</span></div>
      <div class="mini-stat-sub">тем освоено</div>
    </div>

    <div class="mini-stat">
      <div class="mini-stat-label">Средний балл</div>
      <div class="mini-stat-val" style="color:${stats.avgScore===null?'var(--text-muted)':stats.avgScore>=70?'var(--green-text)':'var(--amber-text)'}">${stats.avgScore !== null ? stats.avgScore+'%' : '—'}</div>
      <div class="mini-stat-sub">по тестам</div>
    </div>

    <div class="mini-stat">
      <div class="mini-stat-label">К повторению</div>
      <div class="mini-stat-val" style="color:${rep>0?'var(--amber-text)':'var(--green-text)'}">${rep}</div>
      <div class="mini-stat-sub">тем</div>
    </div>

    <div class="section-heading">Разделы</div>
    ${DB.sections.map(s => {
      const prog = sectionProgress(s);
      return `<div class="section-stat-item">
        <div class="section-stat-name">${esc(s.icon||'📁')} ${esc(s.title)} <span>${prog}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;background:${s.color||'var(--accent)'}"></div></div>
      </div>`;
    }).join('')}
  `;
}

/* ═══════════════════════════════════════════════════
   BADGE HELPERS
═══════════════════════════════════════════════════ */
function statusBadge(s) {
  const map = { done: ['badge-done','Освоено'], review: ['badge-review','Повторить'], learning: ['badge-learning','Изучаю'] };
  const [cls, label] = map[s] || ['badge-learning', s];
  return `<span class="badge ${cls}">${label}</span>`;
}
function priorityBadge(p) {
  const map = { high: ['badge-high','↑ Высокий'], medium: ['badge-medium','→ Средний'], low: ['badge-low','↓ Низкий'] };
  const [cls, label] = map[p] || [];
  return cls ? `<span class="badge ${cls}">${label}</span>` : '';
}
function difficultyStars(n = 1) {
  if (!n) return '';
  const stars = '★'.repeat(n) + '☆'.repeat(5-n);
  return `<span class="badge badge-tag" title="Сложность">${stars}</span>`;
}

/* ═══════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════ */
function openModal(id) {
  const el = $(id); if (el) { el.classList.add('open'); el.querySelector('.modal-close')?.addEventListener('click', () => closeModal(id)); }
}
function closeModal(id) { $(id)?.classList.remove('open'); }
function closeAllModals() { $$('.modal-overlay.open').forEach(m => m.classList.remove('open')); }

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAllModals();
});

/* ─── SECTION MODAL ─── */
function openSectionModal(sectionId = null) {
  const section = sectionId ? findSection(sectionId) : null;
  const modal = buildModal('sectionModal', section ? 'Редактировать раздел' : 'Новый раздел', `
    <div class="form-group">
      <label class="form-label">Название *</label>
      <input class="form-input" id="sm_title" value="${esc(section?.title||'')}" placeholder="Например: Структуры данных">
    </div>
    <div class="form-group">
      <label class="form-label">Описание</label>
      <input class="form-input" id="sm_desc" value="${esc(section?.description||'')}" placeholder="Краткое описание раздела">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Иконка (эмодзи)</label>
        <input class="form-input" id="sm_icon" value="${esc(section?.icon||'')}" placeholder="📚">
      </div>
      <div class="form-group">
        <label class="form-label">Цвет акцента</label>
        <input type="color" class="form-input" id="sm_color" value="${section?.color||'#3b82f6'}" style="height:38px;padding:4px">
      </div>
    </div>
  `, () => {
    const title = $('sm_title').value.trim();
    if (!title) { notify('Введите название раздела', 'error'); return; }
    if (section) {
      section.title = title;
      section.description = $('sm_desc').value.trim();
      section.icon = $('sm_icon').value.trim() || '📁';
      section.color = $('sm_color').value;
    } else {
      DB.sections.push({ id: uid(), title, description: $('sm_desc').value.trim(), icon: $('sm_icon').value.trim() || '📁', color: $('sm_color').value, topics: [] });
    }
    saveDB(); closeAllModals(); notify(section ? 'Раздел обновлён' : 'Раздел создан', 'success'); render();
  });
  document.body.appendChild(modal);
  openModal('sectionModal');
  $('sm_title')?.focus();
}

/* ─── TOPIC MODAL ─── */
function openTopicModal(topicId = null) {
  const section = findSection(UI.activeSectionId);
  if (!section) return;
  const topic = topicId ? findTopic(UI.activeSectionId, topicId) : null;

  let tagsArr = [...(topic?.tags || [])];
  let difficulty = topic?.difficulty || 1;

  const modal = buildModal('topicModal', topic ? 'Редактировать тему' : 'Новая тема', `
    <div class="form-group">
      <label class="form-label">Название *</label>
      <input class="form-input" id="tm_title" value="${esc(topic?.title||'')}" placeholder="Название темы">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Статус</label>
        <select class="form-select" id="tm_status">
          <option value="learning" ${topic?.status==='learning'?'selected':''}>📘 Изучаю</option>
          <option value="review" ${topic?.status==='review'?'selected':''}>🔄 Повторить</option>
          <option value="done" ${topic?.status==='done'?'selected':''}>✅ Освоено</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Приоритет</label>
        <select class="form-select" id="tm_priority">
          <option value="low" ${topic?.priority==='low'?'selected':''}>↓ Низкий</option>
          <option value="medium" ${topic?.priority==='medium'||!topic?.priority?'selected':''}>→ Средний</option>
          <option value="high" ${topic?.priority==='high'?'selected':''}>↑ Высокий</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Дата повторения</label>
        <input type="date" class="form-input" id="tm_lastReview" value="${topic?.lastReview||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Дедлайн</label>
        <input type="date" class="form-input" id="tm_deadline" value="${topic?.deadline||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Сложность</label>
      <div class="difficulty-stars" id="starsWrap">
        ${[1,2,3,4,5].map(i=>`<button type="button" class="star-btn ${i<=difficulty?'on':'off'}" data-star="${i}">★</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Теги</label>
      <div class="form-input tags-container" id="tagsContainer" style="min-height:40px;cursor:text">
        ${tagsArr.map(t=>`<span class="badge badge-tag">#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button></span>`).join('')}
        <input type="text" class="tags-input-field" id="tagsInput" placeholder="Добавить тег…">
      </div>
      <div class="form-hint">Нажмите Enter или запятую для добавления тега</div>
    </div>
    <div class="form-group">
      <label class="form-check">
        <input type="checkbox" id="tm_difficult" ${topic?.isDifficult?'checked':''}>
        <span class="form-check-label">⚠ Пометить как сложную тему</span>
      </label>
    </div>
  `, () => {
    const title = $('tm_title').value.trim();
    if (!title) { notify('Введите название темы', 'error'); return; }
    const data = {
      title,
      status: $('tm_status').value,
      priority: $('tm_priority').value,
      lastReview: $('tm_lastReview').value || null,
      deadline: $('tm_deadline').value || null,
      difficulty,
      tags: tagsArr,
      isDifficult: $('tm_difficult').checked,
    };
    if (topic) {
      Object.assign(topic, data);
    } else {
      if (!section.topics) section.topics = [];
      section.topics.push({ id: uid(), ...data, notes: '', links: [], tests: [], testHistory: [] });
    }
    saveDB(); closeAllModals(); notify(topic ? 'Тема обновлена' : 'Тема создана', 'success'); render();
  });

  document.body.appendChild(modal);
  openModal('topicModal');
  $('tm_title')?.focus();

  // Stars
  const starsWrap = $('starsWrap');
  starsWrap?.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      difficulty = parseInt(btn.dataset.star);
      starsWrap.querySelectorAll('.star-btn').forEach((b,i) => {
        b.className = `star-btn ${i < difficulty ? 'on' : 'off'}`;
      });
    });
  });

  // Tags
  const tagsContainer = $('tagsContainer');
  const tagsInput = $('tagsInput');

  function refreshTags() {
    tagsContainer.querySelectorAll('.badge').forEach(b => b.remove());
    tagsArr.forEach(t => {
      const badge = ce('span', { cls: 'badge badge-tag' });
      badge.innerHTML = `#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button>`;
      badge.querySelector('.tag-remove').addEventListener('click', () => {
        tagsArr = tagsArr.filter(x => x !== t);
        refreshTags();
      });
      tagsContainer.insertBefore(badge, tagsInput);
    });
  }

  tagsContainer?.addEventListener('click', () => tagsInput?.focus());
  tagsInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagsInput.value.trim().replace(/,/g,'');
      if (val && !tagsArr.includes(val)) { tagsArr.push(val); refreshTags(); }
      tagsInput.value = '';
    } else if (e.key === 'Backspace' && !tagsInput.value && tagsArr.length) {
      tagsArr.pop(); refreshTags();
    }
  });

  // Remove existing tag badges and re-render
  tagsContainer?.querySelectorAll('.badge').forEach(b => b.remove());
  refreshTags();
}

/* ─── LINK MODAL ─── */
function openLinkModal(sectionId, topicId, linkId = null) {
  const topic = findTopic(sectionId, topicId);
  if (!topic) return;
  const link = linkId ? topic.links?.find(l => l.id === linkId) : null;

  const modal = buildModal('linkModal', link ? 'Редактировать ссылку' : 'Добавить ссылку', `
    <div class="form-group">
      <label class="form-label">Название *</label>
      <input class="form-input" id="lm_title" value="${esc(link?.title||'')}" placeholder="Название ресурса">
    </div>
    <div class="form-group">
      <label class="form-label">URL *</label>
      <input class="form-input" id="lm_url" value="${esc(link?.url||'')}" placeholder="https://..." type="url">
    </div>
    <div class="form-group">
      <label class="form-label">Примечание</label>
      <input class="form-input" id="lm_note" value="${esc(link?.note||'')}" placeholder="Краткое описание">
    </div>
  `, () => {
    const title = $('lm_title').value.trim();
    const url   = $('lm_url').value.trim();
    if (!title || !url) { notify('Заполните название и URL', 'error'); return; }
    if (!topic.links) topic.links = [];
    if (link) {
      link.title = title; link.url = url; link.note = $('lm_note').value.trim();
    } else {
      topic.links.push({ id: uid(), title, url, note: $('lm_note').value.trim() });
    }
    saveDB(); closeAllModals(); notify(link ? 'Ссылка обновлена' : 'Ссылка добавлена', 'success'); render();
  });

  document.body.appendChild(modal);
  openModal('linkModal');
  $('lm_title')?.focus();
}

/* ─── TEST MODAL ─── */
function openTestModal(sectionId, topicId, testId = null) {
  const topic = findTopic(sectionId, topicId);
  if (!topic) return;
  const test = testId ? topic.tests?.find(t => t.id === testId) : null;

  const modal = buildModal('testModal', test ? 'Редактировать вопрос' : 'Новый вопрос', `
    <div class="form-group">
      <label class="form-label">Вопрос *</label>
      <textarea class="form-textarea" id="qm_question" rows="2" placeholder="Текст вопроса">${esc(test?.question||'')}</textarea>
    </div>
    ${[0,1,2,3].map(i => `
      <div class="form-group">
        <label class="form-label">Вариант ${String.fromCharCode(65+i)} ${i===0?'*':''}</label>
        <input class="form-input" id="qm_opt${i}" value="${esc(test?.options?.[i]||'')}" placeholder="Вариант ответа ${String.fromCharCode(65+i)}">
      </div>
    `).join('')}
    <div class="form-group">
      <label class="form-label">Правильный ответ *</label>
      <select class="form-select" id="qm_correct">
        ${[0,1,2,3].map(i=>`<option value="${i}" ${test?.correct===i?'selected':''}>Вариант ${String.fromCharCode(65+i)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Объяснение (показывается после ответа)</label>
      <textarea class="form-textarea" id="qm_expl" rows="2" placeholder="Почему этот ответ правильный...">${esc(test?.explanation||'')}</textarea>
    </div>
  `, () => {
    const question = $('qm_question').value.trim();
    const opts = [0,1,2,3].map(i => $('qm_opt'+i).value.trim());
    if (!question) { notify('Введите вопрос', 'error'); return; }
    if (opts.some(o => !o)) { notify('Заполните все варианты ответа', 'error'); return; }
    const correct = parseInt($('qm_correct').value);
    const explanation = $('qm_expl').value.trim();
    if (!topic.tests) topic.tests = [];
    if (test) {
      test.question = question; test.options = opts; test.correct = correct; test.explanation = explanation;
    } else {
      topic.tests.push({ id: uid(), question, options: opts, correct, explanation, history: [] });
    }
    saveDB(); closeAllModals(); notify(test ? 'Вопрос обновлён' : 'Вопрос добавлен', 'success'); render();
  });

  document.body.appendChild(modal);
  openModal('testModal');
  $('qm_question')?.focus();
}

/* ─── MODAL BUILDER ─── */
function buildModal(id, title, bodyHTML, onSave) {
  // Remove existing modal with same id
  document.getElementById(id)?.remove();

  const overlay = ce('div', { id, cls: 'modal-overlay' });
  const modal = ce('div', { cls: 'modal modal-lg' });
  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">${esc(title)}</span>
      <button class="modal-close" type="button">×</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="${id}_cancel">Отмена</button>
      <button class="btn btn-primary" id="${id}_save">💾 Сохранить</button>
    </div>
  `;
  overlay.appendChild(modal);

  overlay.querySelector('.modal-close')?.addEventListener('click', () => closeModal(id));
  overlay.querySelector(`#${id}_cancel`)?.addEventListener('click', () => closeModal(id));
  overlay.querySelector(`#${id}_save`)?.addEventListener('click', onSave);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(id); });

  // Enter to save
  overlay.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) onSave(); });

  return overlay;
}

/* ═══════════════════════════════════════════════════
   CRUD OPERATIONS
═══════════════════════════════════════════════════ */
function deleteSection(sectionId) {
  if (!confirm(`Удалить раздел «${findSection(sectionId)?.title}» и все темы?`)) return;
  DB.sections = DB.sections.filter(s => s.id !== sectionId);
  if (UI.activeSectionId === sectionId) { UI.activeSectionId = null; UI.activeTopicId = null; UI.view = 'home'; }
  saveDB(); notify('Раздел удалён', 'success'); render();
}

function deleteTopic(sectionId, topicId) {
  const section = findSection(sectionId);
  if (!section || !confirm(`Удалить тему «${findTopic(sectionId, topicId)?.title}»?`)) return;
  section.topics = section.topics.filter(t => t.id !== topicId);
  if (UI.activeTopicId === topicId) { UI.activeTopicId = null; UI.view = 'section'; }
  saveDB(); notify('Тема удалена', 'success'); render();
}

/* ═══════════════════════════════════════════════════
   EXPORT / IMPORT / RESET
═══════════════════════════════════════════════════ */
function exportData() {
  const json = JSON.stringify(DB, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pkb2-export-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notify('Данные экспортированы', 'success');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.sections) throw new Error('Неверный формат файла');
        if (!confirm('Заменить текущие данные импортированными?')) return;
        DB = parsed;
        saveDB();
        notify('Данные импортированы', 'success');
        UI.view = 'home'; UI.activeSectionId = null; UI.activeTopicId = null;
        render();
      } catch(err) { notify('Ошибка импорта: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function resetData() {
  if (!confirm('Сбросить все данные к исходным? Текущие данные будут потеряны!')) return;
  try {
    const res = await fetch('data.json');
    DB = await res.json();
    saveDB();
    notify('Данные сброшены к исходным', 'success');
    UI.view = 'home'; UI.activeSectionId = null; UI.activeTopicId = null;
    render();
  } catch(e) { notify('Не удалось загрузить data.json', 'error'); }
}

/* ═══════════════════════════════════════════════════
   GLOBAL EVENT BINDING
═══════════════════════════════════════════════════ */
function bindGlobalEvents() {
  // Sidebar toggle
  $('btnSidebar')?.addEventListener('click', () => {
    UI.sidebarCollapsed = !UI.sidebarCollapsed;
    DB.settings = DB.settings || {};
    DB.settings.sidebarCollapsed = UI.sidebarCollapsed;
    saveDB(); render();
  });

  // Theme toggle
  $('btnTheme')?.addEventListener('click', () => {
    DB.settings = DB.settings || {};
    DB.settings.darkMode = !(DB.settings.darkMode !== false);
    saveDB(); applyTheme();
  });

  // Navigation buttons
  $('navHome')?.addEventListener('click',  () => { UI.view = 'home';       render(); });
  $('navRep')?.addEventListener('click',   () => { UI.view = 'repetition'; render(); });
  $('navExam')?.addEventListener('click',  () => { UI.view = 'exam';  UI.examState = null; render(); });
  $('navSearch')?.addEventListener('click',() => { UI.view = 'search';     render(); });

  // Export/Import/Reset in topbar
  $('btnExport')?.addEventListener('click', exportData);
  $('btnImport')?.addEventListener('click', importData);

  // Search
  let searchTimer;
  $('searchInput')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    UI.searchQuery = e.target.value;
    searchTimer = setTimeout(() => {
      if (UI.searchQuery.trim()) { UI.view = 'search'; render(); }
    }, 280);
  });
  $('searchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && UI.searchQuery.trim()) { UI.view = 'search'; render(); }
  });
}
