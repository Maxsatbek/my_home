// /**
//  * PKB 2.0 — Personal Knowledge Base
//  * Vanilla JS, no dependencies
//  */

// 'use strict';

// /* ═══════════════════════════════════════════════════
//    STATE & CONSTANTS
// ═══════════════════════════════════════════════════ */
// const LS_KEY = 'pkb2_data';
// const LS_UI  = 'pkb2_ui';

// let DB = { sections: [], settings: { darkMode: true, sidebarCollapsed: false, spacedRepetitionDays: 3 } };
// let UI = {
//   view: 'home',
//   activeSectionId: null,
//   activeTopicId: null,
//   activeTab: 'notes',
//   sidebarCollapsed: false,
//   // examConfig: { sectionId: null, count: 10 },
//   examConfig: { sectionId: null, topicId: null, count: 10 },
//   examState: null,   // { questions, current, answers, score }
//   editingNotes: false,
//   searchQuery: '',
//   tagFilter: null,
// };

// /* ═══════════════════════════════════════════════════
//    BOOTSTRAP
// ═══════════════════════════════════════════════════ */
// document.addEventListener('DOMContentLoaded', async () => {
//   await loadData();
//   loadUIState();
//   applyTheme();
//   bindGlobalEvents();
//   render();
// });

// async function loadData() {
//   const stored = localStorage.getItem(LS_KEY);
//   if (stored) {
//     try { DB = JSON.parse(stored); return; } catch(e) { /* fall through */ }
//   }
//   // Load default data.json
//   try {
//     const res = await fetch('data.json');
//     DB = await res.json();
//     saveDB();
//   } catch(e) {
//     DB = { sections: [], settings: { darkMode: true, sidebarCollapsed: false, spacedRepetitionDays: 3 } };
//   }
// }

// function saveDB() { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }

// function loadUIState() {
//   const s = localStorage.getItem(LS_UI);
//   if (s) { try { Object.assign(UI, JSON.parse(s)); } catch(e){} }
//   // Reset transient state
//   UI.examState = null;
//   UI.editingNotes = false;
//   UI.searchQuery = '';
// }

// function saveUIState() {
//   const { view, activeSectionId, activeTopicId, activeTab, sidebarCollapsed } = UI;
//   localStorage.setItem(LS_UI, JSON.stringify({ view, activeSectionId, activeTopicId, activeTab, sidebarCollapsed }));
// }

// function applyTheme() {
//   const dark = DB.settings?.darkMode !== false;
//   document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
//   const btn = $('btnTheme');
//   if (btn) btn.textContent = dark ? '☀️' : '🌙';
// }

// /* ═══════════════════════════════════════════════════
//    UTILITIES
// ═══════════════════════════════════════════════════ */
// const $ = id => document.getElementById(id);
// const $$ = sel => document.querySelectorAll(sel);
// const uid = () => '_' + Date.now().toString(36) + Math.random().toString(36).substr(2,5);
// const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// const today = () => new Date().toISOString().split('T')[0];
// const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' }) : '—';
// const isOverdue = d => d && new Date(d) < new Date();
// const shuffle = arr => { const a = [...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

// function notify(msg, type = 'info') {
//   const el = document.createElement('div');
//   el.className = `notification ${type}`;
//   el.textContent = msg;
//   document.body.appendChild(el);
//   setTimeout(() => el.style.opacity = '0', 2200);
//   setTimeout(() => el.remove(), 2500);
// }

// function ce(tag, props = {}, ...children) {
//   const el = document.createElement(tag);
//   Object.entries(props).forEach(([k,v]) => {
//     if (k === 'cls') el.className = v;
//     else if (k === 'html') el.innerHTML = v;
//     else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
//     else el.setAttribute(k, v);
//   });
//   children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
//   return el;
// }

// /* ─── DATA FINDERS ─── */
// const findSection = id => DB.sections.find(s => s.id === id);
// const findTopic   = (sid, tid) => findSection(sid)?.topics?.find(t => t.id === tid);
// function findTopicGlobal(tid) {
//   for (const s of DB.sections) {
//     const t = s.topics?.find(t => t.id === tid);
//     if (t) return { section: s, topic: t };
//   }
//   return null;
// }

// /* ─── STATS ─── */
// function globalStats() {
//   let sections = DB.sections.length, topics = 0, done = 0, tests = 0, totalScore = 0, attempts = 0;
//   DB.sections.forEach(s => {
//     (s.topics||[]).forEach(t => {
//       topics++;
//       if (t.status === 'done') done++;
//       (t.tests||[]).forEach(q => {
//         tests++;
//         (q.history||[]).forEach(h => { totalScore += h.correct?1:0; attempts++; });
//       });
//     });
//   });
//   const avgScore = attempts > 0 ? Math.round((totalScore / attempts) * 100) : null;
//   return { sections, topics, done, tests, avgScore };
// }

// function sectionProgress(section) {
//   const topics = section.topics || [];
//   if (!topics.length) return 0;
//   return Math.round(topics.filter(t => t.status === 'done').length / topics.length * 100);
// }

// function sectionAvgScore(section) {
//   let total = 0, count = 0;
//   (section.topics||[]).forEach(t => {
//     (t.tests||[]).forEach(q => {
//       (q.history||[]).forEach(h => { total += h.correct?1:0; count++; });
//     });
//   });
//   return count > 0 ? Math.round(total / count * 100) : null;
// }

// function getRepetitionList() {
//   const days = DB.settings?.spacedRepetitionDays || 3;
//   const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
//   const items = [];
//   DB.sections.forEach(s => {
//     (s.topics||[]).forEach(t => {
//       const lastR = t.lastReview ? new Date(t.lastReview) : null;
//       const needsReview = t.status !== 'done' || (lastR && lastR < cutoff) || t.isDifficult;
//       if (needsReview) items.push({ section: s, topic: t });
//     });
//   });
//   items.sort((a,b) => {
//     const da = a.topic.lastReview ? new Date(a.topic.lastReview) : new Date(0);
//     const db = b.topic.lastReview ? new Date(b.topic.lastReview) : new Date(0);
//     return da - db;
//   });
//   return items;
// }

// /* ═══════════════════════════════════════════════════
//    MARKDOWN RENDERER (mini)
// ═══════════════════════════════════════════════════ */
// function renderMd(src) {
//   if (!src || !src.trim()) return `<span class="notes-empty">Нет заметок. Нажмите «Редактировать» для добавления.</span>`;
//   let s = src;
//   // Escape HTML
//   s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
//   // Fenced code blocks
//   s = s.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) =>
//     `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`);
//   // Inline code
//   s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
//   // Table (basic)
//   s = s.replace(/^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, body) => {
//     const heads = header.split('|').map(h => `<th>${h.trim()}</th>`).join('');
//     const rows = body.trim().split('\n').map(r => {
//       const cells = r.split('|').filter((_,i,a)=>i>0&&i<a.length-1).map(c=>`<td>${c.trim()}</td>`).join('');
//       return `<tr>${cells}</tr>`;
//     }).join('');
//     return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
//   });
//   // H1-H3
//   s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
//   s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
//   s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
//   // Blockquote
//   s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
//   // HR
//   s = s.replace(/^---$/gm, '<hr>');
//   // Bold/italic
//   s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
//   s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
//   s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
//   // Unordered list
//   s = s.replace(/(^[-*] .+\n?)+/gm, m => `<ul>${m.replace(/^[-*] (.+)$/gm, '<li>$1</li>')}</ul>`);
//   // Ordered list
//   s = s.replace(/(^\d+\. .+\n?)+/gm, m => `<ol>${m.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')}</ol>`);
//   // Links
//   s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
//   // Paragraphs (split on double newline)
//   s = s.split(/\n\n+/).map(block => {
//     block = block.trim();
//     if (!block) return '';
//     if (/^<(h[1-6]|ul|ol|pre|blockquote|table|hr)/.test(block)) return block;
//     return `<p>${block.replace(/\n/g, '<br>')}</p>`;
//   }).join('');
//   return s;
// }

// /* ═══════════════════════════════════════════════════
//    RENDER ENGINE
// ═══════════════════════════════════════════════════ */
// function render() {
//   renderTopbar();
//   renderSidebar();
//   renderContent();
//   renderStatsPanel();
//   saveUIState();
// }

// function renderTopbar() {
//   const sbToggle = $('btnSidebar');
//   if (sbToggle) sbToggle.innerHTML = UI.sidebarCollapsed ? '▶' : '◀';
//   const searchEl = $('searchInput');
//   if (searchEl && document.activeElement !== searchEl) searchEl.value = UI.searchQuery;
// }

// /* ─── СВАЙП ДЛЯ ЗАКРЫТИЯ САЙДБАРА ─── */
// (function() {
//   const sidebar = document.getElementById('sidebar');
//   if (!sidebar) return;

//   let touchStartX = 0;
//   let touchStartY = 0;

//   // Начало касания
//   sidebar.addEventListener('touchstart', (e) => {
//     touchStartX = e.changedTouches[0].screenX;
//     touchStartY = e.changedTouches[0].screenY;
//   }, { passive: true });

//   // Конец касания
//   sidebar.addEventListener('touchend', (e) => {
//     const touchEndX = e.changedTouches[0].screenX;
//     const touchEndY = e.changedTouches[0].screenY;
    
//     const diffX = touchStartX - touchEndX; // Сдвиг по горизонтали
//     const diffY = Math.abs(touchStartY - touchEndY); // Сдвиг по вертикали

//     // Если сдвинули влево больше чем на 50px 
//     // и это было именно горизонтальное движение (diffX > diffY)
//     if (diffX > 50 && diffX > diffY) {
//       // Проверяем, не закрыт ли он уже
//       if (!UI.sidebarCollapsed) {
//         UI.sidebarCollapsed = true; // Устанавливаем состояние "закрыто"
//         render(); // Перерисовываем интерфейс (кнопка в TOPBAR сама поменяется на ▶)
//       }
//     }
//   }, { passive: true });
// })();

// /* ─── SIDEBAR ─── */
// function renderSidebar() {
//   const sidebar = $('sidebar');
//   if (!sidebar) return;
//   sidebar.classList.toggle('collapsed', UI.sidebarCollapsed);
//   const list = $('sectionsList');
//   if (!list) return;
//   list.innerHTML = '';
//   DB.sections.forEach(section => renderSidebarSection(section, list));
// }

// function renderSidebarSection(section, container) {
//   const isExpanded = !section._collapsed;
//   const item = ce('div', { cls: 'section-item' });

//   const row = ce('div', {
//     cls: `section-row ${UI.activeSectionId === section.id && UI.view === 'section' ? 'active' : ''}`,
//   });
//   row.addEventListener('click', e => {
//     if (e.target.closest('.section-actions')) return;
//     if (UI.activeSectionId === section.id) {
//       section._collapsed = !section._collapsed;
//     } else {
//       UI.activeSectionId = section.id;
//       UI.view = 'section';
//       UI.activeTopicId = null;
//       section._collapsed = false;
//     }
//     render();
//   });

//   const chevron = ce('span', { cls: `section-chevron ${isExpanded ? 'open' : ''}` }, '▶');
//   const icon = ce('span', { cls: 'section-icon' }, section.icon || '📁');
//   const name = ce('span', { cls: 'section-name' }, section.title);
//   const count = ce('span', { cls: 'section-count' }, String((section.topics||[]).length));
//   const actions = ce('span', { cls: 'section-actions' });

//   const editBtn = ce('button', { cls: 'ibtn', title: 'Редактировать', onclick: e => { e.stopPropagation(); openSectionModal(section.id); } }, '✏️');
//   const delBtn  = ce('button', { cls: 'ibtn danger', title: 'Удалить', onclick: e => { e.stopPropagation(); deleteSection(section.id); } }, '🗑️');
//   actions.append(editBtn, delBtn);
//   row.append(chevron, icon, name, count, actions);
//   item.appendChild(row);

//   if (isExpanded) {
//     const topicsDiv = ce('div', { cls: 'topics-list' });
//     (section.topics||[]).forEach(topic => {
//       const dot = ce('span', { cls: 'topic-status-dot' });
//       dot.style.background = statusColor(topic.status);
//       const tItem = ce('div', {
//         cls: `topic-item ${UI.activeTopicId === topic.id ? 'active' : ''}`,
//         onclick: () => { UI.activeSectionId = section.id; UI.activeTopicId = topic.id; UI.view = 'topic'; UI.activeTab = 'notes'; render(); }
//       }, dot, ce('span', { cls: 'topic-item-name' }, topic.title));
//       topicsDiv.appendChild(tItem);
//     });
//     item.appendChild(topicsDiv);
//   }
//   container.appendChild(item);
// }

// function statusColor(s) {
//   return s === 'done' ? '#34d399' : s === 'review' ? '#fbbf24' : '#60a5fa';
// }

// /* ─── MAIN CONTENT ─── */
// function renderContent() {
//   const content = $('content');
//   if (!content) return;

//   // Hide all views
//   $$('.view').forEach(v => v.classList.remove('active'));

//   switch (UI.view) {
//     case 'home':        renderHome();       break;
//     case 'section':     renderSectionView();break;
//     case 'topic':       renderTopicView();  break;
//     case 'exam':        renderExamView();   break;
//     case 'repetition':  renderRepetitionView(); break;
//     case 'search':      renderSearchView(); break;
//     default:            renderHome();
//   }
// }

// /* ─── HOME ─── */
// function renderHome() {
//   let view = $('viewHome');
//   if (!view) {
//     view = ce('div', { id: 'viewHome', cls: 'view' });
//     $('content').appendChild(view);
//   }
//   view.classList.add('active');
//   const stats = globalStats();

//   view.innerHTML = `
//     <div class="view-header">
//       <div>
//         <div class="view-title">Главная</div>
//         <div class="view-subtitle">Время на исходе</div>
//       </div>
//       <div class="view-actions">
//         <button class="btn btn-secondary btn-sm" id="btnExportHome">⬆ Экспорт</button>
//         <button class="btn btn-secondary btn-sm" id="btnImportHome">⬇ Импорт</button>
//         <button class="btn btn-secondary btn-sm" id="btnResetHome">↺ Сброс</button>
//         <button class="btn btn-primary" id="btnAddSectionHome">+ Раздел</button>
//       </div>
//     </div>

//     <div class="stats-grid">
//       <div class="stat-card">
//         <div class="stat-label">Разделов</div>
//         <div class="stat-value" style="color:var(--accent-hover)">${stats.sections}</div>
//         <div class="stat-detail">категорий</div>
//       </div>
//       <div class="stat-card">
//         <div class="stat-label">Тем</div>
//         <div class="stat-value" style="color:var(--purple-text)">${stats.topics}</div>
//         <div class="stat-detail">${stats.done} освоено</div>
//       </div>
//       <div class="stat-card">
//         <div class="stat-label">Вопросов</div>
//         <div class="stat-value" style="color:var(--teal-text)">${stats.tests}</div>
//         <div class="stat-detail">в тестах</div>
//       </div>
//       <div class="stat-card">
//         <div class="stat-label">Средний балл</div>
//         <div class="stat-value" style="color:${stats.avgScore===null?'var(--text-muted)':stats.avgScore>=70?'var(--green-text)':'var(--amber-text)'}">${stats.avgScore !== null ? stats.avgScore + '%' : '—'}</div>
//         <div class="stat-detail">по тестам</div>
//       </div>
//     </div>

//     <div class="section-heading">Разделы</div>
//     <div class="section-cards" id="homeCards"></div>
//   `;

//   // Section cards
//   const cards = $('homeCards');
//   if (!DB.sections.length) {
//     cards.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">Нет разделов</div><div class="empty-desc">Создайте первый раздел, чтобы начать</div></div>`;
//   } else {
//     DB.sections.forEach(s => {
//       const prog = sectionProgress(s);
//       const avg  = sectionAvgScore(s);
//       const card = ce('div', { cls: 'section-card', 'data-sid': s.id });
//       card.style.setProperty('--card-color', s.color || 'var(--accent)');
//       card.innerHTML = `
//         <div class="section-card-head">
//           <span class="section-card-icon">${s.icon || '📁'}</span>
//           <div style="display:flex;gap:4px">
//             <button class="ibtn" data-edit-section="${s.id}">✏️</button>
//             <button class="ibtn danger" data-del-section="${s.id}">🗑️</button>
//           </div>
//         </div>
//         <div class="section-card-title">${esc(s.title)}</div>
//         <div class="section-card-desc">${esc(s.description || '')}</div>
//         <div class="section-card-progress">
//           <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;background:${s.color||'var(--accent)'}"></div></div>
//         </div>
//         <div class="section-card-footer">
//           <span>${(s.topics||[]).filter(t=>t.status==='done').length}/${(s.topics||[]).length} освоено</span>
//           <span>${avg !== null ? avg + '% балл' : ''}</span>
//           <span>${prog}%</span>
//         </div>
//       `;
//       card.addEventListener('click', e => {
//         if (e.target.closest('[data-edit-section]') || e.target.closest('[data-del-section]')) return;
//         UI.activeSectionId = s.id; UI.view = 'section'; render();
//       });
//       card.querySelector(`[data-edit-section="${s.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); openSectionModal(s.id); });
//       card.querySelector(`[data-del-section="${s.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); deleteSection(s.id); });
//       cards.appendChild(card);
//     });
//   }

//   $('btnAddSectionHome')?.addEventListener('click', () => openSectionModal());
//   $('btnExportHome')?.addEventListener('click', exportData);
//   $('btnImportHome')?.addEventListener('click', importData);
//   $('btnResetHome')?.addEventListener('click', resetData);
// }

// /* ─── SECTION VIEW ─── */
// function renderSectionView() {
//   const section = findSection(UI.activeSectionId);
//   if (!section) { UI.view = 'home'; renderHome(); return; }

//   let view = $('viewSection');
//   if (!view) { view = ce('div', { id: 'viewSection', cls: 'view' }); $('content').appendChild(view); }
//   view.classList.add('active');

//   const prog = sectionProgress(section);
//   const avg  = sectionAvgScore(section);

//   view.innerHTML = `
//     <div class="view-header">
//       <div>
//         <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;cursor:pointer" id="backHome">← Главная</div>
//         <div class="view-title">${esc(section.icon||'📁')} ${esc(section.title)}</div>
//         <div class="view-subtitle">${esc(section.description||'')} &nbsp;·&nbsp; ${prog}% освоено${avg!==null?` · Средний балл: ${avg}%`:''}</div>
//       </div>
//       <div class="view-actions">
//         <button class="btn btn-primary" id="btnAddTopic">+ Тема</button>
//         <button class="btn btn-secondary" id="btnExamSection">🎓 Экзамен</button>
//       </div>
//     </div>

//     <div class="mb-12" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">
//       <div class="progress-fill" style="height:5px;width:${prog}%;background:${section.color||'var(--accent)'}"></div>
//     </div>

//     <div class="topics-grid" id="topicsGrid"></div>
//   `;

//   $('backHome')?.addEventListener('click', () => { UI.view = 'home'; render(); });
//   $('btnAddTopic')?.addEventListener('click', () => openTopicModal());
//   $('btnExamSection')?.addEventListener('click', () => { UI.view = 'exam'; UI.examConfig.sectionId = section.id; UI.examState = null; render(); });

//   const grid = $('topicsGrid');
//   const topics = section.topics || [];
//   if (!topics.length) {
//     grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">Нет тем</div><div class="empty-desc">Добавьте первую тему в этот раздел</div></div>`;
//     return;
//   }

//   topics.forEach(topic => {
//     const card = ce('div', { cls: 'topic-card' });
//     card.innerHTML = `
//       <div class="topic-card-actions">
//         <button class="ibtn" data-edit-topic="${topic.id}">✏️</button>
//         <button class="ibtn danger" data-del-topic="${topic.id}">🗑️</button>
//       </div>
//       <div class="topic-card-title">${esc(topic.title)}</div>
//       <div class="topic-card-meta">
//         ${statusBadge(topic.status)}
//         ${priorityBadge(topic.priority)}
//         ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложно</span>' : ''}
//         ${difficultyStars(topic.difficulty)}
//       </div>
//       <div class="topic-card-footer">
//         <span style="display:flex;gap:4px;flex-wrap:wrap">${(topic.tags||[]).map(t=>`<span class="badge badge-tag">#${esc(t)}</span>`).join('')}</span>
//         <span>${(topic.tests||[]).length} вопр.</span>
//       </div>
//     `;
//     card.addEventListener('click', e => {
//       if (e.target.closest('[data-edit-topic]') || e.target.closest('[data-del-topic]')) return;
//       UI.activeTopicId = topic.id; UI.view = 'topic'; UI.activeTab = 'notes'; render();
//     });
//     card.querySelector(`[data-edit-topic="${topic.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); openTopicModal(topic.id); });
//     card.querySelector(`[data-del-topic="${topic.id}"]`)?.addEventListener('click', e => { e.stopPropagation(); deleteTopic(UI.activeSectionId, topic.id); });
//     grid.appendChild(card);
//   });
// }

// /* ─── TOPIC VIEW ─── */
// function renderTopicView() {
//   const res = findTopicGlobal(UI.activeTopicId);
//   if (!res) { UI.view = 'home'; renderHome(); return; }
//   const { section, topic } = res;

//   let view = $('viewTopic');
//   if (!view) { view = ce('div', { id: 'viewTopic', cls: 'view' }); $('content').appendChild(view); }
//   view.classList.add('active');

//   const deadlineClass = isOverdue(topic.deadline) ? 'overdue' : '';

//   view.innerHTML = `
//     <div class="topic-detail-header">
//       <div class="topic-breadcrumb">
//         <span style="cursor:pointer;color:var(--text-link)" id="backToSection">← ${esc(section.title)}</span>
//       </div>
//       <div class="topic-detail-title">${esc(topic.title)}</div>
//       <div class="topic-detail-meta">
//         ${statusBadge(topic.status)}
//         ${priorityBadge(topic.priority)}
//         ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложная</span>' : ''}
//         ${difficultyStars(topic.difficulty)}
//         ${(topic.tags||[]).map(t=>`<span class="badge badge-tag">#${esc(t)}</span>`).join('')}
//       </div>
//       <div class="topic-dates">
//         <span class="topic-date-item">Повторение: <span>${fmtDate(topic.lastReview)}</span></span>
//         ${topic.deadline ? `<span class="topic-date-item ${deadlineClass}">Дедлайн: <span class="${deadlineClass}">${fmtDate(topic.deadline)}</span></span>` : ''}
//       </div>
//     </div>

//     <div class="view-actions mb-12" style="justify-content:flex-start">
//       <button class="btn btn-secondary btn-sm" id="btnEditTopic">✏️ Редактировать тему</button>
//       <button class="btn btn-secondary btn-sm" id="btnMarkReviewed">✅ Отметить повторённой</button>
//       <button class="btn btn-secondary btn-sm" id="btnToggleDifficult">${topic.isDifficult ? '✓ Снять «Сложно»' : '⚠ Отметить сложной'}</button>
//     </div>

//     <div class="tab-nav">
//       <button class="tab-btn ${UI.activeTab==='notes'?'active':''}" data-tab="notes">📝 Заметки</button>
//       <button class="tab-btn ${UI.activeTab==='links'?'active':''}" data-tab="links">🔗 Ссылки (${(topic.links||[]).length})</button>
//       <button class="tab-btn ${UI.activeTab==='tests'?'active':''}" data-tab="tests">❓ Тесты (${(topic.tests||[]).length})</button>
//     </div>

//     <div id="tabPanels"></div>
//   `;

//   $('backToSection')?.addEventListener('click', () => { UI.activeSectionId = section.id; UI.view = 'section'; render(); });
//   $('btnEditTopic')?.addEventListener('click', () => openTopicModal(topic.id));
//   $('btnMarkReviewed')?.addEventListener('click', () => {
//     topic.lastReview = today();
//     if (topic.status === 'learning') topic.status = 'review';
//     saveDB(); notify('Отмечено как повторённое', 'success'); render();
//   });
//   $('btnToggleDifficult')?.addEventListener('click', () => {
//     topic.isDifficult = !topic.isDifficult;
//     saveDB(); notify(topic.isDifficult ? 'Отмечено как сложная' : 'Метка снята', 'success'); render();
//   });

//   $$('.tab-btn').forEach(btn => {
//     btn.addEventListener('click', () => { UI.activeTab = btn.dataset.tab; render(); });
//   });

//   renderTabPanel(section, topic);
// }

// function renderTabPanel(section, topic) {
//   const panels = $('tabPanels');
//   if (!panels) return;
//   panels.innerHTML = '';

//   if (UI.activeTab === 'notes')  renderNotesPanel(topic, panels);
//   if (UI.activeTab === 'links')  renderLinksPanel(section, topic, panels);
//   if (UI.activeTab === 'tests')  renderTestsPanel(section, topic, panels);
// }

// /* ─── NOTES PANEL ─── */
// function renderNotesPanel(topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div class="notes-toolbar">
//       ${!UI.editingNotes ? `<button class="btn btn-secondary btn-sm" id="btnEditNotes">✏️ Редактировать</button>` : ''}
//     </div>
//     <div class="notes-container">
//       <div class="notes-display md" id="notesDisplay"></div>
//       <div class="notes-editor-wrap ${UI.editingNotes?'visible':''}" id="notesEditorWrap">
//         <textarea id="notesTextarea" placeholder="# Заголовок&#10;&#10;Поддерживает **Markdown**: *курсив*, \`код\`, \`\`\`блок кода\`\`\`, > цитата, - список"></textarea>
//         <div class="notes-editor-actions">
//           <button class="btn btn-ghost btn-sm" id="btnCancelNotes">Отмена</button>
//           <button class="btn btn-primary btn-sm" id="btnSaveNotes">💾 Сохранить</button>
//         </div>
//       </div>
//     </div>
//   `;
//   container.appendChild(panel);

//   $('notesDisplay').innerHTML = renderMd(topic.notes || '');

//   if (UI.editingNotes) {
//     const ta = $('notesTextarea');
//     if (ta) { ta.value = topic.notes || ''; ta.focus(); }
//   }

//   $('btnEditNotes')?.addEventListener('click', () => { UI.editingNotes = true; render(); });
//   $('btnCancelNotes')?.addEventListener('click', () => { UI.editingNotes = false; render(); });
//   $('btnSaveNotes')?.addEventListener('click', () => {
//     topic.notes = $('notesTextarea').value;
//     saveDB(); UI.editingNotes = false;
//     notify('Заметки сохранены', 'success'); render();
//   });
// }

// // /* ─── LINKS PANEL ─── */
// // function renderLinksPanel(section, topic, container) {
// //   const panel = ce('div', { cls: 'tab-panel active' });
// //   panel.innerHTML = `
// //     <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
// //       <button class="btn btn-primary btn-sm" id="btnAddLink">+ Ссылка</button>
// //     </div>
// //     <div class="links-list" id="linksList"></div>
// //   `;
// //   container.appendChild(panel);

// //   $('btnAddLink')?.addEventListener('click', () => openLinkModal(section.id, topic.id));

// //   const list = $('linksList');
// //   const links = topic.links || [];
// //   if (!links.length) {
// //     list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">Нет ссылок</div></div>`;
// //     return;
// //   }
// //   links.forEach(link => {
// //     const isYT = link.url?.includes('youtube') || link.url?.includes('youtu.be');
// //     const card = ce('div', { cls: 'link-card' });
// //     card.innerHTML = `
// //       <span class="link-favicon">${isYT ? '▶️' : '🌐'}</span>
// //       <div class="link-info">
// //         <div class="link-title">${esc(link.title)}</div>
// //         <div class="link-url">${esc(link.url)}</div>
// //         ${link.note ? `<div class="link-note">${esc(link.note)}</div>` : ''}
// //       </div>
// //       <div class="link-actions">
// //         <a href="${esc(link.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Открыть ↗</a>
// //         <button class="ibtn btn-edit-link" data-lid="${link.id}">✏️</button>
// //         <button class="ibtn danger btn-del-link" data-lid="${link.id}">🗑️</button>
// //       </div>
// //     `;
// //     card.querySelector(`[data-lid="${link.id}"].btn-edit-link`)?.addEventListener('click', () => openLinkModal(section.id, topic.id, link.id));
// //     card.querySelector(`[data-lid="${link.id}"].btn-del-link`)?.addEventListener('click', () => {
// //       if (!confirm('Удалить ссылку?')) return;
// //       topic.links = links.filter(l => l.id !== link.id);
// //       saveDB(); notify('Ссылка удалена'); render();
// //     });
// //     list.appendChild(card);
// //   });
// // }
// /* ─── LINKS PANEL ─── */
// function renderLinksPanel(section, topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
//       <button class="btn btn-primary btn-sm" id="btnAddLink">+ Ссылка</button>
//     </div>
//     <div class="links-list" id="linksList"></div>
//   `;
//   container.appendChild(panel);

//   $('btnAddLink')?.addEventListener('click', () => openLinkModal(section.id, topic.id));

//   const list = $('linksList');
//   const links = topic.links || [];
//   if (!links.length) {
//     list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">Нет ссылок</div></div>`;
//     return;
//   }
  
//   links.forEach(link => {
//     const isYT = link.url?.includes('youtube') || link.url?.includes('youtu.be');
//     const card = ce('div', { cls: 'link-card' });
    
//     // Вносим изменения здесь:
//     // 1. .link-title теперь тег <a> с атрибутами для открытия в новой вкладке
//     // 2. Из .link-actions удалена кнопка "Открыть"
//     card.innerHTML = `
//       <span class="link-favicon">${isYT ? '▶️' : '🌐'}</span>
//       <div class="link-info">
//         <a href="${esc(link.url)}" target="_blank" rel="noopener" class="link-title" style="text-decoration:none; color:inherit; cursor:pointer; display:block;">
//           ${esc(link.title)} ↗
//         </a>
//         <div class="link-url">${esc(link.url)}</div>
//         ${link.note ? `<div class="link-note">${esc(link.note)}</div>` : ''}
//       </div>
//       <div class="link-actions">
//         <button class="ibtn btn-edit-link" data-lid="${link.id}">✏️</button>
//         <button class="ibtn danger btn-del-link" data-lid="${link.id}">🗑️</button>
//       </div>
//     `;

//     card.querySelector(`[data-lid="${link.id}"].btn-edit-link`)?.addEventListener('click', () => openLinkModal(section.id, topic.id, link.id));
//     card.querySelector(`[data-lid="${link.id}"].btn-del-link`)?.addEventListener('click', () => {
//       if (!confirm('Удалить ссылку?')) return;
//       topic.links = links.filter(l => l.id !== link.id);
//       saveDB(); notify('Ссылка удалена'); render();
//     });
//     list.appendChild(card);
//   });
// }
// /* ─── TESTS PANEL ─── */
// // function renderTestsPanel(section, topic, container) {
// //   const panel = ce('div', { cls: 'tab-panel active' });
// //   panel.innerHTML = `
// //     <div class="tests-toolbar">
// //       <button class="btn btn-success btn-sm" id="btnRunTests">▶ Пройти тест</button>
// //       <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
// //     </div>
// //     <div class="tests-list" id="testsList"></div>
// //   `;
// //   container.appendChild(panel);

// //   $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
// //   $('btnRunTests')?.addEventListener('click', () => {
// //     // Run inline quiz — reset all questions
// //     $$('.test-option').forEach(o => {
// //       o.disabled = false;
// //       o.className = 'test-option';
// //     });
// //     $$('.test-explanation').forEach(e => e.classList.remove('visible'));
// //     notify('Тест сброшен — отвечайте на вопросы!', 'info');
// //   });

// //   const list = $('testsList');
// //   const tests = topic.tests || [];
// //   if (!tests.length) {
// //     list.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-title">Нет вопросов</div><div class="empty-desc">Добавьте вопросы для самопроверки</div></div>`;
// //     return;
// //   }

// //   tests.forEach(q => {
// //     const card = ce('div', { cls: 'test-card', id: `tc_${q.id}` });
// //     const history = q.history || [];
// //     const lastAttempts = history.slice(-5);
// //     const shuffledIdx = shuffle([0,1,2,3]);
// //     const displayOptions = shuffledIdx.map(i => ({ text: q.options[i], origIdx: i }));
// //     const newCorrectIdx = displayOptions.findIndex(o => o.origIdx === q.correct);

// //     card.innerHTML = `
// //       <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
// //         <div class="test-question">${esc(q.question)}</div>
// //         <div style="display:flex;gap:3px;flex-shrink:0">
// //           <button class="ibtn btn-edit-test" data-qid="${q.id}">✏️</button>
// //           <button class="ibtn danger btn-del-test" data-qid="${q.id}">🗑️</button>
// //         </div>
// //       </div>
// //       <div class="test-options" id="opts_${q.id}"></div>
// //       <div class="test-explanation" id="expl_${q.id}">${esc(q.explanation || '')}</div>
// //       <div class="test-footer">
// //         <div class="test-history">
// //           ${lastAttempts.map(a => `<span class="test-attempt ${a.correct?'pass':'fail'}">${a.correct?'✓':'✗'}</span>`).join('')}
// //         </div>
// //         <span class="text-muted text-sm">${history.length > 0 ? Math.round(history.filter(h=>h.correct).length/history.length*100)+'% верно' : 'Нет попыток'}</span>
// //       </div>
// //     `;

// //     const optsDiv = card.querySelector(`#opts_${q.id}`);
// //     displayOptions.forEach((opt, dispIdx) => {
// //       const letters = ['A','B','C','D'];
// //       const btn = ce('button', { cls: 'test-option' });
// //       btn.innerHTML = `<span class="test-opt-letter">${letters[dispIdx]}</span><span class="test-opt-text">${esc(opt.text)}</span>`;
// //       btn.addEventListener('click', () => {
// //         // Disable all options
// //         optsDiv.querySelectorAll('.test-option').forEach((b, i) => {
// //           b.disabled = true;
// //           if (i === newCorrectIdx) b.classList.add('correct');
// //         });
// //         if (dispIdx !== newCorrectIdx) btn.classList.add('wrong');
// //         const correct = dispIdx === newCorrectIdx;
// //         // Save history
// //         if (!q.history) q.history = [];
// //         q.history.push({ date: today(), correct });
// //         saveDB();
// //         // Show explanation
// //         const expl = card.querySelector(`#expl_${q.id}`);
// //         if (expl && q.explanation) expl.classList.add('visible');
// //       });
// //       optsDiv.appendChild(btn);
// //     });

// //     card.querySelector(`.btn-edit-test[data-qid="${q.id}"]`)?.addEventListener('click', () => openTestModal(section.id, topic.id, q.id));
// //     card.querySelector(`.btn-del-test[data-qid="${q.id}"]`)?.addEventListener('click', () => {
// //       if (!confirm('Удалить вопрос?')) return;
// //       topic.tests = tests.filter(t => t.id !== q.id);
// //       saveDB(); notify('Вопрос удалён'); render();
// //     });

// //     list.appendChild(card);
// //   });
// // }
// /* ─── TESTS PANEL (ОБНОВЛЕННАЯ) ─── */
// // function renderTestsPanel(section, topic, container) {
// //   const panel = ce('div', { cls: 'tab-panel active' });
// //   panel.innerHTML = `
// //     <div class="tests-toolbar">
// //       <button class="btn btn-success btn-sm" id="btnRunTests">▶ Сбросить и пройти заново</button>
// //       <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
// //     </div>
// //     <div class="tests-list" id="testsList"></div>
// //   `;
// //   container.appendChild(panel);

// //   $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
// //   $('btnRunTests')?.addEventListener('click', () => {
// //     render(); // Просто перерисовываем панель, чтобы сбросить все состояния
// //     notify('Тест сброшен', 'info');
// //   });
// /* ─── TESTS PANEL (ОБНОВЛЕННАЯ С ИМПОРТОМ) ─── */
// function renderTestsPanel(section, topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div class="tests-toolbar">
//       <button class="btn btn-success btn-sm" id="btnRunTests">▶ Сбросить и пройти</button>
//       <button class="btn btn-secondary btn-sm" id="btnImportTests">⬇ Импорт из ИИ</button>
//       <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
//     </div>
//     <div class="tests-list" id="testsList"></div>
//   `;
//   container.appendChild(panel);

//   $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
//   $('btnImportTests')?.addEventListener('click', () => openImportTestsModal(section.id, topic.id)); // Новая кнопка
//   $('btnRunTests')?.addEventListener('click', () => {
//     render(); 
//     notify('Тест сброшен', 'info');
//   });

//   const list = $('testsList');
//   const tests = topic.tests || [];
//   if (!tests.length) {
//     list.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-title">Нет вопросов</div><div class="empty-desc">Добавьте вопросы для самопроверки</div></div>`;
//     return;
//   }

//   tests.forEach(q => {
//     const card = ce('div', { cls: 'test-card', id: `tc_${q.id}` });
//     const history = q.history || [];
//     const lastAttempts = history.slice(-5);
    
//     // Поддержка и старых (число) и новых (массив) правильных ответов
//     const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
    
//     // Перемешиваем все доступные индексы (теперь их может быть хоть 10)
//     const indices = q.options.map((_, i) => i);
//     const shuffledIdx = shuffle(indices);
//     const displayOptions = shuffledIdx.map(i => ({ text: q.options[i], origIdx: i }));

//     card.innerHTML = `
//       <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
//         <div class="test-question">${esc(q.question)}</div>
//         <div style="display:flex;gap:3px;flex-shrink:0">
//           <button class="ibtn btn-edit-test" data-qid="${q.id}">✏️</button>
//           <button class="ibtn danger btn-del-test" data-qid="${q.id}">🗑️</button>
//         </div>
//       </div>
//       <div class="test-options" id="opts_${q.id}"></div>
      
//       <div class="test-actions" id="actions_${q.id}" style="margin-top: 12px;">
//         <button class="btn btn-primary btn-sm btn-check-test" style="width:100%">Проверить ответ</button>
//       </div>

//       <div class="test-explanation" id="expl_${q.id}">${esc(q.explanation || '')}</div>
      
//       <div class="test-footer">
//         <div class="test-history">
//           ${lastAttempts.map(a => `<span class="test-attempt ${a.correct?'pass':'fail'}">${a.correct?'✓':'✗'}</span>`).join('')}
//         </div>
//         <span class="text-muted text-sm">${history.length > 0 ? Math.round(history.filter(h=>h.correct).length/history.length*100)+'% верно' : 'Нет попыток'}</span>
//       </div>
//     `;

//     const optsDiv = card.querySelector(`#opts_${q.id}`);
    
//     // Создаем кнопки вариантов
//     displayOptions.forEach((opt, dispIdx) => {
//       // Генерируем буквы динамически (A, B, C, D, E, F...)
//       const letter = String.fromCharCode(65 + dispIdx); 
//       const btn = ce('button', { cls: 'test-option' });
//       btn.dataset.origIdx = opt.origIdx; // Сохраняем реальный индекс в данные кнопки
      
//       btn.innerHTML = `<span class="test-opt-letter">${letter}</span><span class="test-opt-text">${esc(opt.text)}</span>`;
      
//       btn.addEventListener('click', () => {
//         if (btn.classList.contains('correct') || btn.classList.contains('wrong') || btn.disabled) return;
//         btn.classList.toggle('selected'); // Просто выделяем/снимаем выделение
//       });
      
//       optsDiv.appendChild(btn);
//     });

//     // Логика кнопки "Проверить"
//     const checkBtn = card.querySelector('.btn-check-test');
//     checkBtn.addEventListener('click', () => {
//       const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
//       const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.origIdx));

//       if (selectedIndices.length === 0) {
//         notify('Выберите хотя бы один вариант', 'warning');
//         return;
//       }

//       // Сравниваем массивы (все ли правильные выбраны и нет ли лишних)
//       const isCorrect = selectedIndices.length === correctArr.length && 
//                         selectedIndices.every(idx => correctArr.includes(idx));

//       // Визуализация результатов
//       optsDiv.querySelectorAll('.test-option').forEach(btn => {
//         btn.disabled = true;
//         const idx = parseInt(btn.dataset.origIdx);
        
//         if (correctArr.includes(idx)) {
//           btn.classList.add('correct'); // Показываем все правильные зеленым
//         }
//         if (btn.classList.contains('selected') && !correctArr.includes(idx)) {
//           btn.classList.add('wrong'); // Ошибочно выбранные — красным
//         }
//         btn.classList.remove('selected');
//       });

//       // Сохраняем историю
//       if (!q.history) q.history = [];
//       q.history.push({ date: today(), correct: isCorrect });
//       saveDB();

//       // Показываем объяснение и скрываем кнопку проверки
//       checkBtn.parentElement.style.display = 'none';
//       const expl = card.querySelector(`#expl_${q.id}`);
//       if (expl && q.explanation) expl.classList.add('visible');
      
//       // Обновляем футер (процент успеха) без полной перерисовки страницы
//       render(); 
//     });

//     // Удаление и редактирование
//     card.querySelector(`.btn-edit-test`)?.addEventListener('click', () => openTestModal(section.id, topic.id, q.id));
//     card.querySelector(`.btn-del-test`)?.addEventListener('click', () => {
//       if (!confirm('Удалить вопрос?')) return;
//       topic.tests = tests.filter(t => t.id !== q.id);
//       saveDB(); notify('Вопрос удалён'); render();
//     });

//     list.appendChild(card);
//   });
// }

// /* ─── EXAM VIEW ─── */
// function renderExamView() {
//   let view = $('viewExam');
//   if (!view) { view = ce('div', { id: 'viewExam', cls: 'view' }); $('content').appendChild(view); }
//   view.classList.add('active');

//   if (!UI.examState) {
//     renderExamSetup(view);
//   } else if (UI.examState.finished) {
//     renderExamResult(view);
//   } else {
//     renderExamQuestion(view);
//   }
// }

// // function renderExamSetup(view) {
// //   const counts = [10, 20, 35, 50];
// //   view.innerHTML = `
// //     <div class="view-header">
// //       <div><div class="view-title">🎓 Экзамен</div><div class="view-subtitle">Проверьте свои знания</div></div>
// //       <button class="btn btn-ghost btn-sm" id="backFromExam">← Назад</button>
// //     </div>
// //     <div class="exam-container">
// //       <div class="exam-setup-card">
// //         <div class="exam-setup-icon">🎓</div>
// //         <div class="exam-setup-title">Настройка экзамена</div>
// //         <div class="exam-setup-desc">Выберите раздел и количество вопросов</div>
// //         <div class="mb-16" style="text-align:left">
// //           <div class="form-group">
// //             <label class="form-label">Раздел</label>
// //             <select class="form-select" id="examSection">
// //               <option value="">Все разделы</option>
// //               ${DB.sections.map(s => `<option value="${s.id}" ${UI.examConfig.sectionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
// //             </select>
// //           </div>
// //         </div>
// //         <div class="exam-options-row">
// //           ${counts.map(n => `<div class="exam-option-card ${UI.examConfig.count===n?'selected':''}" data-count="${n}"><div class="exam-option-n">${n}</div><div class="exam-option-label">вопросов</div></div>`).join('')}
// //         </div>
// //         <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:14px;padding:12px" id="btnStartExam">Начать экзамен →</button>
// //       </div>
// //     </div>
// //   `;

// //   $('backFromExam')?.addEventListener('click', () => { UI.view = UI.activeSectionId ? 'section' : 'home'; render(); });
// //   $('examSection')?.addEventListener('change', e => { UI.examConfig.sectionId = e.target.value || null; });
// //   $$('.exam-option-card').forEach(c => {
// //     c.addEventListener('click', () => {
// //       $$('.exam-option-card').forEach(x => x.classList.remove('selected'));
// //       c.classList.add('selected');
// //       UI.examConfig.count = parseInt(c.dataset.count);
// //     });
// //   });
// //   $('btnStartExam')?.addEventListener('click', startExam);
// // }
// function renderExamSetup(view) {
//   const counts = [10, 20, 35, 50];
//   const selectedSection = UI.examConfig.sectionId ? findSection(UI.examConfig.sectionId) : null;

//   view.innerHTML = `
//     <div class="view-header">
//       <div><div class="view-title">🎓 Экзамен</div><div class="view-subtitle">Проверьте свои знания</div></div>
//       <button class="btn btn-ghost btn-sm" id="backFromExam">← Назад</button>
//     </div>
//     <div class="exam-container">
//       <div class="exam-setup-card">
//         <div class="exam-setup-icon">🎓</div>
//         <div class="exam-setup-title">Настройка экзамена</div>
//         <div class="exam-setup-desc">Выберите раздел, тему и количество вопросов</div>
        
//         <div class="mb-16" style="text-align:left; display:flex; flex-direction:column; gap:12px;">
//           <div class="form-group" style="margin-bottom: 0;">
//             <label class="form-label">Раздел</label>
//             <select class="form-select" id="examSection">
//               <option value="">Все разделы</option>
//               ${DB.sections.map(s => `<option value="${s.id}" ${UI.examConfig.sectionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
//             </select>
//           </div>

//           ${selectedSection ? `
//           <div class="form-group" style="margin-bottom: 0; animation: fadeIn 0.3s ease;">
//             <label class="form-label">Тема</label>
//             <select class="form-select" id="examTopic">
//               <option value="">Все темы раздела</option>
//               ${(selectedSection.topics||[]).map(t => `<option value="${t.id}" ${UI.examConfig.topicId===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}
//             </select>
//           </div>
//           ` : ''}
//         </div>

//         <div class="exam-options-row">
//           ${counts.map(n => `<div class="exam-option-card ${UI.examConfig.count===n?'selected':''}" data-count="${n}"><div class="exam-option-n">${n}</div><div class="exam-option-label">вопросов</div></div>`).join('')}
//         </div>
//         <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:14px;padding:12px" id="btnStartExam">Начать экзамен →</button>
//       </div>
//     </div>
//   `;

//   $('backFromExam')?.addEventListener('click', () => { UI.view = UI.activeSectionId ? 'section' : 'home'; render(); });
  
//   // Обработчик раздела
//   $('examSection')?.addEventListener('change', e => { 
//     UI.examConfig.sectionId = e.target.value || null; 
//     UI.examConfig.topicId = null; // Сбрасываем выбранную тему при смене раздела
//     render(); // Перерисовываем интерфейс, чтобы показать новые темы
//   });

//   // Обработчик темы
//   $('examTopic')?.addEventListener('change', e => {
//     UI.examConfig.topicId = e.target.value || null;
//   });

//   $$('.exam-option-card').forEach(c => {
//     c.addEventListener('click', () => {
//       $$('.exam-option-card').forEach(x => x.classList.remove('selected'));
//       c.classList.add('selected');
//       UI.examConfig.count = parseInt(c.dataset.count);
//     });
//   });
  
//   $('btnStartExam')?.addEventListener('click', startExam);
// }

// // function collectExamQuestions() {
// //   const sections = UI.examConfig.sectionId
// //     ? DB.sections.filter(s => s.id === UI.examConfig.sectionId)
// //     : DB.sections;
// //   const allQ = [];
// //   sections.forEach(s => {
// //     (s.topics||[]).forEach(t => {
// //       (t.tests||[]).forEach(q => allQ.push({ ...q, _topicTitle: t.title, _sectionTitle: s.title, _topicId: t.id, _sectionId: s.id }));
// //     });
// //   });
// //   return shuffle(allQ).slice(0, UI.examConfig.count);
// // }

// // function startExam() {
// //   const questions = collectExamQuestions();
// //   if (!questions.length) { notify('Нет доступных вопросов в этом разделе', 'warning'); return; }
// //   UI.examState = {
// //     questions,
// //     current: 0,
// //     answers: new Array(questions.length).fill(null),
// //     shuffledOpts: questions.map(q => {
// //       const idx = shuffle([0,1,2,3]);
// //       return { shuffledIdx: idx, newCorrect: idx.findIndex(i => i === q.correct) };
// //     }),
// //     revealed: new Array(questions.length).fill(false),
// //     finished: false,
// //     score: 0,
// //   };
// //   render();
// // }
// function collectExamQuestions() {
//   const sections = UI.examConfig.sectionId
//     ? DB.sections.filter(s => s.id === UI.examConfig.sectionId)
//     : DB.sections;
    
//   const allQ = [];
  
//   sections.forEach(s => {
//     // Если выбрана конкретная тема, фильтруем топики
//     const topics = UI.examConfig.topicId
//       ? (s.topics || []).filter(t => t.id === UI.examConfig.topicId)
//       : (s.topics || []);

//     topics.forEach(t => {
//       (t.tests||[]).forEach(q => allQ.push({ 
//         ...q, 
//         _topicTitle: t.title, 
//         _sectionTitle: s.title, 
//         _topicId: t.id, 
//         _sectionId: s.id 
//       }));
//     });
//   });
  
//   return shuffle(allQ).slice(0, UI.examConfig.count);
// }

// function startExam() {
//   const questions = collectExamQuestions(); // Предполагаем, что эта функция у вас есть и работает
//   if (!questions.length) { 
//     notify('Нет доступных вопросов в этом разделе', 'warning'); 
//     return; 
//   }

//   UI.examState = {
//     questions: questions.map(q => {
//       // 1. Создаем массив индексов [0, 1, 2, ... до конца options]
//       const indices = q.options.map((_, i) => i);
//       // 2. Перемешиваем индексы
//       const shuffledIndices = shuffle(indices);
//       // 3. Получаем массив правильных ответов (всегда как массив)
//       const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
      
//       return {
//         ...q,
//         // Сохраняем перемешанные тексты вариантов
//         shuffledOptions: shuffledIndices.map(i => q.options[i]),
//         // Сохраняем новые позиции правильных ответов
//         newCorrectIndices: shuffledIndices
//           .map((origIdx, newIdx) => correctArr.includes(origIdx) ? newIdx : -1)
//           .filter(idx => idx !== -1)
//       };
//     }),
//     current: 0,
//     answers: [], // Будем наполнять через push
//     score: 0,
//   };
//   render();
// }
// // function renderExamQuestion(view) {
// //   const es = UI.examState;
// //   const qi = es.current;
// //   const q = es.questions[qi];
// //   const total = es.questions.length;
// //   const answered = es.answers[qi] !== null;
// //   const { shuffledIdx, newCorrect } = es.shuffledOpts[qi];
// //   const opts = shuffledIdx.map(i => q.options[i]);
// //   const letters = ['A','B','C','D'];

// //   view.innerHTML = `
// //     <div class="view-header" style="margin-bottom:8px">
// //       <div><div class="view-title">🎓 Экзамен</div></div>
// //       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
// //     </div>
// //     <div class="exam-container">
// //       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
// //         <span class="exam-qnum">${q._sectionTitle} · ${q._topicTitle}</span>
// //         <span class="exam-qnum">Вопрос ${qi+1} / ${total}</span>
// //       </div>
// //       <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${((qi+1)/total*100)}%"></div></div>
// //       <div class="exam-question-card">
// //         <div class="exam-question-text">${esc(q.question)}</div>
// //         <div class="exam-options" id="examOpts"></div>
// //         ${q.explanation && es.revealed[qi] ? `<div style="margin-top:14px;padding:12px;background:var(--accent-dim);border-radius:var(--radius-md);border-left:3px solid var(--accent);font-size:12px;color:var(--text-secondary)">${esc(q.explanation)}</div>` : ''}
// //       </div>
// //       <div class="exam-nav">
// //         <button class="btn btn-secondary" id="btnExamPrev" ${qi===0?'disabled':''}>← Назад</button>
// //         ${qi < total-1
// //           ? `<button class="btn btn-primary" id="btnExamNext" ${!answered?'disabled':''}>Далее →</button>`
// //           : `<button class="btn btn-success" id="btnExamFinish" ${!answered?'disabled':''}>Завершить ✓</button>`
// //         }
// //       </div>
// //     </div>
// //   `;

// //   const optsDiv = $('examOpts');
// //   opts.forEach((opt, dispIdx) => {
// //     const btn = ce('button', { cls: 'exam-opt' });
// //     let cls = '';
// //     if (es.revealed[qi]) {
// //       if (dispIdx === newCorrect) cls = 'correct';
// //       else if (dispIdx === es.answers[qi] && dispIdx !== newCorrect) cls = 'wrong';
// //       btn.disabled = true;
// //     }
// //     btn.className = 'exam-opt ' + cls;
// //     if (!es.revealed[qi]) btn.disabled = false;
// //     btn.innerHTML = `<span class="exam-opt-letter">${letters[dispIdx]}</span>${esc(opt)}`;
// //     btn.addEventListener('click', () => {
// //       if (es.revealed[qi]) return;
// //       es.answers[qi] = dispIdx;
// //       es.revealed[qi] = true;
// //       if (dispIdx === newCorrect) es.score++;
// //       // Save history
// //       const origTopic = findTopic(q._sectionId, q._topicId);
// //       const origQ = origTopic?.tests?.find(t => t.id === q.id);
// //       if (origQ) {
// //         if (!origQ.history) origQ.history = [];
// //         origQ.history.push({ date: today(), correct: dispIdx === newCorrect });
// //         saveDB();
// //       }
// //       render();
// //     });
// //     optsDiv.appendChild(btn);
// //   });

// //   $('btnExitExam')?.addEventListener('click', () => {
// //     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
// //   });
// //   $('btnExamPrev')?.addEventListener('click', () => { es.current--; render(); });
// //   $('btnExamNext')?.addEventListener('click', () => { es.current++; render(); });
// //   $('btnExamFinish')?.addEventListener('click', () => { es.finished = true; render(); });
// // }
// /* ─── ОБНОВЛЕННЫЙ EXAM QUESTION ─── */
// /* ─── ОБНОВЛЕННЫЙ EXAM QUESTION ─── */
// function renderExamQuestion(view) {
//   if (!UI.examState) return;

//   const { questions, current } = UI.examState;
//   const q = questions[current];

//   view.innerHTML = `
//     <div class="view-header" style="margin-bottom:8px">
//       <div><div class="view-title">🎓 Экзамен</div></div>
//       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
//     </div>
//     <div class="exam-container">
//       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
//         <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
//         <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
//       </div>
//       <div class="exam-progress-bar">
//         <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
//       </div>
      
//       <div class="exam-question-card" style="margin-top: 16px;">
//         <div class="exam-question-text">${esc(q.question)}</div>
//         <div class="test-options" id="exam_opts"></div>
        
//         <div style="margin-top: 20px;">
//           <button class="btn btn-primary" id="btnNextExam" style="width: 100%">Подтвердить ответ</button>
//         </div>
//       </div>
//     </div>
//   `;

//   $('btnExitExam')?.addEventListener('click', () => {
//     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
//   });

//   const optsDiv = $('exam_opts');
  
//   // Отрисовываем заранее перемешанные варианты
//   q.shuffledOptions.forEach((optText, i) => {
//     const btn = ce('button', { cls: 'test-option' });
//     // Сохраняем индекс варианта прямо в кнопке
//     btn.dataset.idx = i;
    
//     btn.innerHTML = `
//       <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
//       <span class="test-opt-text">${esc(optText)}</span>
//     `;
    
//     btn.onclick = () => {
//       btn.classList.toggle('selected');
//     };
//     optsDiv.appendChild(btn);
//   });

//   $('btnNextExam').onclick = () => {
//     // Собираем индексы всех выбранных кнопок
//     const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
//     const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

//     if (selectedIndices.length === 0) {
//       notify('Выберите хотя бы один вариант', 'warning');
//       return;
//     }

//     handleExamAnswer(selectedIndices);
//   };
// }
// function handleExamAnswer(userIndices) {
//   const { questions, current } = UI.examState;
//   const q = questions[current];
  
//   // Правильные индексы в текущем (перемешанном) вопросе
//   const correctArr = q.newCorrectIndices;

//   // Проверка: количество совпадает И каждый выбранный индекс есть в списке правильных
//   const isCorrect = userIndices.length === correctArr.length && 
//                     userIndices.every(idx => correctArr.includes(idx));

//   UI.examState.answers.push(isCorrect);
//   if (isCorrect) UI.examState.score++;

//   // Сохраняем историю ответов в базу для статистики (Средний балл)
//   const origTopic = findTopic(q._sectionId, q._topicId);
//   if (origTopic) {
//     const origQ = origTopic.tests?.find(t => t.id === q.id);
//     if (origQ) {
//       if (!origQ.history) origQ.history = [];
//       origQ.history.push({ date: today(), correct: isCorrect });
//       saveDB();
//     }
//   }

//   UI.examState.current++;

//   // Если вопросы закончились, ставим флаг завершения
//   if (UI.examState.current >= questions.length) {
//     UI.examState.finished = true;
//   }
  
//   // Вызываем глобальный render() — он сам решит показать следующий вопрос или итоги
//   render(); 
// }

// function renderExamResult(view) {
//   const es = UI.examState;
//   const pct = Math.round(es.score / es.questions.length * 100);
//   const cls = pct >= 80 ? 'score-excellent' : pct >= 50 ? 'score-good' : 'score-poor';
//   const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖';
//   view.innerHTML = `
//     <div class="exam-container">
//       <div class="exam-result-card">
//         <div style="font-size:56px;margin-bottom:12px">${emoji}</div>
//         <div class="exam-result-score ${cls}">${pct}%</div>
//         <div class="exam-result-label">${es.score} из ${es.questions.length} правильно</div>
//         <div class="exam-result-sub" style="margin-top:8px">${pct>=80?'Отличный результат!':pct>=50?'Хороший результат, есть над чем поработать':'Нужно повторить материал'}</div>
//         <div style="display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap">
//           <button class="btn btn-primary" id="btnRetryExam">Пройти ещё раз</button>
//           <button class="btn btn-secondary" id="btnExamHome">На главную</button>
//         </div>
//       </div>
//     </div>
//   `;
//   $('btnRetryExam')?.addEventListener('click', () => { UI.examState = null; render(); });
//   $('btnExamHome')?.addEventListener('click', () => { UI.examState = null; UI.view = 'home'; render(); });
// }

// /* ─── REPETITION VIEW ─── */
// // function renderRepetitionView() {
// //   let view = $('viewRep');
// //   if (!view) { view = ce('div', { id: 'viewRep', cls: 'view' }); $('content').appendChild(view); }
// //   view.classList.add('active');

// //   const items = getRepetitionList();
// //   view.innerHTML = `
// //     <div class="view-header">
// //       <div>
// //         <div class="view-title">🔄 К повторению</div>
// //         <div class="view-subtitle">Темы, требующие внимания · ${items.length} шт.</div>
// //       </div>
// //     </div>
// //     <div class="rep-list" id="repList"></div>
// //   `;

// //   const list = $('repList');
// //   if (!items.length) {
// //     list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">Всё в порядке!</div><div class="empty-desc">Нет тем для повторения</div></div>`;
// //     return;
// //   }
// //   items.forEach(({ section, topic }) => {
// //     const card = ce('div', { cls: `rep-card ${topic.isDifficult?'difficult':''}` });
// //     card.innerHTML = `
// //       <div class="rep-info">
// //         <div class="rep-title">${esc(topic.title)}</div>
// //         <div class="rep-meta">
// //           <span>${esc(section.title)}</span>
// //           <span>Повторение: ${fmtDate(topic.lastReview)}</span>
// //           <span>${statusBadge(topic.status)}</span>
// //           ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложная</span>' : ''}
// //         </div>
// //       </div>
// //       <div class="rep-actions">
// //         <button class="btn btn-secondary btn-sm" data-open-topic="${topic.id}" data-open-section="${section.id}">Открыть</button>
// //         <button class="btn btn-success btn-xs btn-reviewed" data-tid="${topic.id}">✓ Повторено</button>
// //       </div>
// //     `;
// //     card.querySelector(`[data-open-topic="${topic.id}"]`)?.addEventListener('click', () => {
// //       UI.activeSectionId = section.id; UI.activeTopicId = topic.id; UI.view = 'topic'; render();
// //     });
// //     card.querySelector(`.btn-reviewed[data-tid="${topic.id}"]`)?.addEventListener('click', () => {
// //       topic.lastReview = today();
// //       topic.status = 'review';
// //       saveDB(); notify('Тема отмечена повторённой', 'success'); renderRepetitionView();
// //     });
// //     list.appendChild(card);
// //   });
// // }
// /* ─── REPETITION VIEW ─── */
// function renderRepetitionView() {
//   let view = $('viewRep');
//   if (!view) { view = ce('div', { id: 'viewRep', cls: 'view' }); $('content').appendChild(view); }
//   view.classList.add('active');

//   // Инициализируем массив для хранения свернутых разделов, если его нет
//   if (!UI.collapsedRepSections) UI.collapsedRepSections = [];

//   const items = getRepetitionList();
  
//   view.innerHTML = `
//     <div class="view-header">
//       <div>
//         <div class="view-title">🔄 К повторению</div>
//         <div class="view-subtitle">Темы, требующие внимания · ${items.length} шт.</div>
//       </div>
//     </div>
//     <div class="rep-list" id="repList"></div>
//   `;

//   const list = $('repList');
//   if (!items.length) {
//     list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">Всё в порядке!</div><div class="empty-desc">Нет тем для повторения</div></div>`;
//     return;
//   }

//   DB.sections.forEach(section => {
//     const sectionItems = items.filter(it => it.section.id === section.id);

//     if (sectionItems.length > 0) {
//       const groupWrapper = ce('div', { cls: 'rep-section-group', style: 'margin-bottom: 15px' });
      
//       // Проверяем, был ли этот раздел свернут ранее
//       const isCurrentlyCollapsed = UI.collapsedRepSections.includes(section.id);

//       const header = ce('div', { 
//         style: `padding: 12px 15px; background: var(--bg-secondary); border-left: 5px solid ${section.color || 'var(--accent)'}; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 10px; user-select: none; transition: background 0.2s;` 
//       });
      
//       header.onmouseover = () => header.style.background = 'var(--bg-hover)';
//       header.onmouseout = () => header.style.background = 'var(--bg-secondary)';
      
//       header.innerHTML = `
//         <span class="header-arrow" style="transition: transform 0.2s; font-size: 10px; transform: ${isCurrentlyCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}">▼</span>
//         <span>${esc(section.icon || '📁')}</span> 
//         <span style="font-weight: bold;">${esc(section.title)}</span> 
//         <span style="margin-left:auto; opacity: 0.6; font-size: 0.8em; background: var(--bg-primary); padding: 2px 8px; border-radius: 10px;">${sectionItems.length}</span>
//       `;

//       const cardsContainer = ce('div', { 
//         style: `transition: all 0.3s ease; overflow: hidden; display: ${isCurrentlyCollapsed ? 'none' : 'block'}` 
//       });

//       // Логика переключения с сохранением состояния
//       header.addEventListener('click', () => {
//         const isCollapsed = cardsContainer.style.display === 'none';
        
//         if (isCollapsed) {
//           // Разворачиваем: удаляем ID из списка свернутых
//           cardsContainer.style.display = 'block';
//           header.querySelector('.header-arrow').style.transform = 'rotate(0deg)';
//           UI.collapsedRepSections = UI.collapsedRepSections.filter(id => id !== section.id);
//         } else {
//           // Сворачиваем: добавляем ID в список свернутых
//           cardsContainer.style.display = 'none';
//           header.querySelector('.header-arrow').style.transform = 'rotate(-90deg)';
//           if (!UI.collapsedRepSections.includes(section.id)) {
//             UI.collapsedRepSections.push(section.id);
//           }
//         }
//         // Сохраняем состояние UI, чтобы при перезагрузке оно осталось
//         if (typeof saveUIState === 'function') saveUIState();
//       });

//       sectionItems.forEach(({ topic }) => {
//         const card = ce('div', { cls: `rep-card ${topic.isDifficult ? 'difficult' : ''}` });
//         card.innerHTML = `
//           <div class="rep-info">
//             <div class="rep-title">${esc(topic.title)}</div>
//             <div class="rep-meta">
//               <span>Повторение: ${fmtDate(topic.lastReview)}</span>
//               <span>${statusBadge(topic.status)}</span>
//               ${topic.isDifficult ? '<span class="badge badge-difficult">⚠ Сложная</span>' : ''}
//             </div>
//           </div>
//           <div class="rep-actions">
//             <button class="btn btn-secondary btn-sm" data-open-topic="${topic.id}" data-open-section="${section.id}">Открыть</button>
//             <button class="btn btn-success btn-xs btn-reviewed" data-tid="${topic.id}">✓ Повторено</button>
//           </div>
//         `;

//         card.querySelector(`[data-open-topic="${topic.id}"]`)?.addEventListener('click', (e) => {
//           e.stopPropagation();
//           UI.activeSectionId = section.id; 
//           UI.activeTopicId = topic.id; 
//           UI.view = 'topic'; 
//           render();
//         });

//         card.querySelector(`.btn-reviewed[data-tid="${topic.id}"]`)?.addEventListener('click', (e) => {
//           e.stopPropagation();
//           topic.lastReview = today();
//           topic.status = 'review';
//           saveDB(); 
//           notify('Тема отмечена повторённой', 'success'); 
//           renderRepetitionView();
//         });

//         cardsContainer.appendChild(card);
//       });

//       groupWrapper.appendChild(header);
//       groupWrapper.appendChild(cardsContainer);
//       list.appendChild(groupWrapper);
//     }
//   });
// }

// /* ─── SEARCH VIEW ─── */
// function renderSearchView() {
//   let view = $('viewSearch');
//   if (!view) { view = ce('div', { id: 'viewSearch', cls: 'view' }); $('content').appendChild(view); }
//   view.classList.add('active');

//   const q = UI.searchQuery.trim().toLowerCase();
//   const results = q ? searchAll(q) : [];

//   view.innerHTML = `
//     <div class="view-header">
//       <div>
//         <div class="view-title">🔍 Поиск</div>
//         <div class="view-subtitle">${q ? `Результаты для «${esc(UI.searchQuery)}» · ${results.length} найдено` : 'Введите запрос в строку поиска'}</div>
//       </div>
//     </div>
//     <div class="search-results" id="searchResults"></div>
//   `;

//   const container = $('searchResults');
//   if (!q) {
//     container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Начните вводить запрос</div></div>`;
//     return;
//   }
//   if (!results.length) {
//     container.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><div class="empty-title">Ничего не найдено</div></div>`;
//     return;
//   }
//   results.forEach(r => {
//     const item = ce('div', { cls: 'search-result-item' });
//     item.innerHTML = `
//       <div class="search-result-type">${r.type}</div>
//       <div class="search-result-title">${highlight(r.title, q)}</div>
//       <div class="search-result-ctx">${r.context ? highlight(r.context, q) : ''}</div>
//     `;
//     item.addEventListener('click', r.onClick);
//     container.appendChild(item);
//   });
// }

// function searchAll(q) {
//   const results = [];
//   DB.sections.forEach(s => {
//     if (s.title.toLowerCase().includes(q)) {
//       results.push({ type: 'Раздел', title: s.title, context: s.description || '', onClick: () => { UI.activeSectionId = s.id; UI.view = 'section'; render(); } });
//     }
//     (s.topics||[]).forEach(t => {
//       if (t.title.toLowerCase().includes(q)) {
//         results.push({ type: 'Тема', title: t.title, context: s.title, onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; render(); } });
//       }
//       if (t.notes?.toLowerCase().includes(q)) {
//         const idx = t.notes.toLowerCase().indexOf(q);
//         const ctx = t.notes.slice(Math.max(0, idx-40), idx+80).replace(/\n/g,' ');
//         results.push({ type: 'Заметка', title: t.title, context: '...' + ctx + '...', onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; UI.activeTab = 'notes'; render(); } });
//       }
//       (t.tests||[]).forEach(test => {
//         if (test.question.toLowerCase().includes(q)) {
//           results.push({ type: 'Вопрос теста', title: test.question, context: t.title + ' · ' + s.title, onClick: () => { UI.activeSectionId = s.id; UI.activeTopicId = t.id; UI.view = 'topic'; UI.activeTab = 'tests'; render(); } });
//         }
//       });
//     });
//   });
//   return results;
// }

// function highlight(text, q) {
//   if (!q) return esc(text);
//   const safe = esc(text);
//   const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
//   return safe.replace(re, m => `<mark>${m}</mark>`);
// }

// /* ─── STATS PANEL ─── */
// function renderStatsPanel() {
//   const panel = $('statsPanel');
//   if (!panel) return;
//   const stats = globalStats();
//   const rep = getRepetitionList().length;

//   panel.innerHTML = `
//     <div class="stats-panel-title">Статистика</div>

//     <div class="mini-stat">
//       <div class="mini-stat-label">Прогресс</div>
//       <div class="mini-stat-val" style="color:var(--accent-hover)">${stats.done}<span style="font-size:14px;color:var(--text-muted)">/${stats.topics}</span></div>
//       <div class="mini-stat-sub">тем освоено</div>
//     </div>

//     <div class="mini-stat">
//       <div class="mini-stat-label">Средний балл</div>
//       <div class="mini-stat-val" style="color:${stats.avgScore===null?'var(--text-muted)':stats.avgScore>=70?'var(--green-text)':'var(--amber-text)'}">${stats.avgScore !== null ? stats.avgScore+'%' : '—'}</div>
//       <div class="mini-stat-sub">по тестам</div>
//     </div>

//     <div class="mini-stat">
//       <div class="mini-stat-label">К повторению</div>
//       <div class="mini-stat-val" style="color:${rep>0?'var(--amber-text)':'var(--green-text)'}">${rep}</div>
//       <div class="mini-stat-sub">тем</div>
//     </div>

//     <div class="section-heading">Разделы</div>
//     ${DB.sections.map(s => {
//       const prog = sectionProgress(s);
//       return `<div class="section-stat-item">
//         <div class="section-stat-name">${esc(s.icon||'📁')} ${esc(s.title)} <span>${prog}%</span></div>
//         <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;background:${s.color||'var(--accent)'}"></div></div>
//       </div>`;
//     }).join('')}
//   `;
// }

// /* ═══════════════════════════════════════════════════
//    BADGE HELPERS
// ═══════════════════════════════════════════════════ */
// function statusBadge(s) {
//   const map = { done: ['badge-done','Освоено'], review: ['badge-review','Повторить'], learning: ['badge-learning','Изучаю'] };
//   const [cls, label] = map[s] || ['badge-learning', s];
//   return `<span class="badge ${cls}">${label}</span>`;
// }
// function priorityBadge(p) {
//   const map = { high: ['badge-high','↑ Высокий'], medium: ['badge-medium','→ Средний'], low: ['badge-low','↓ Низкий'] };
//   const [cls, label] = map[p] || [];
//   return cls ? `<span class="badge ${cls}">${label}</span>` : '';
// }
// function difficultyStars(n = 1) {
//   if (!n) return '';
//   const stars = '★'.repeat(n) + '☆'.repeat(5-n);
//   return `<span class="badge badge-tag" title="Сложность">${stars}</span>`;
// }

// /* ═══════════════════════════════════════════════════
//    MODALS
// ═══════════════════════════════════════════════════ */
// function openModal(id) {
//   const el = $(id); if (el) { el.classList.add('open'); el.querySelector('.modal-close')?.addEventListener('click', () => closeModal(id)); }
// }
// function closeModal(id) { $(id)?.classList.remove('open'); }
// function closeAllModals() { $$('.modal-overlay.open').forEach(m => m.classList.remove('open')); }

// document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
// document.addEventListener('click', e => {
//   if (e.target.classList.contains('modal-overlay')) closeAllModals();
// });

// /* ─── SECTION MODAL ─── */
// function openSectionModal(sectionId = null) {
//   const section = sectionId ? findSection(sectionId) : null;
//   const modal = buildModal('sectionModal', section ? 'Редактировать раздел' : 'Новый раздел', `
//     <div class="form-group">
//       <label class="form-label">Название *</label>
//       <input class="form-input" id="sm_title" value="${esc(section?.title||'')}" placeholder="Например: Структуры данных">
//     </div>
//     <div class="form-group">
//       <label class="form-label">Описание</label>
//       <input class="form-input" id="sm_desc" value="${esc(section?.description||'')}" placeholder="Краткое описание раздела">
//     </div>
//     <div class="form-row">
//       <div class="form-group">
//         <label class="form-label">Иконка (эмодзи)</label>
//         <input class="form-input" id="sm_icon" value="${esc(section?.icon||'')}" placeholder="📚">
//       </div>
//       <div class="form-group">
//         <label class="form-label">Цвет акцента</label>
//         <input type="color" class="form-input" id="sm_color" value="${section?.color||'#3b82f6'}" style="height:38px;padding:4px">
//       </div>
//     </div>
//   `, () => {
//     const title = $('sm_title').value.trim();
//     if (!title) { notify('Введите название раздела', 'error'); return; }
//     if (section) {
//       section.title = title;
//       section.description = $('sm_desc').value.trim();
//       section.icon = $('sm_icon').value.trim() || '📁';
//       section.color = $('sm_color').value;
//     } else {
//       DB.sections.push({ id: uid(), title, description: $('sm_desc').value.trim(), icon: $('sm_icon').value.trim() || '📁', color: $('sm_color').value, topics: [] });
//     }
//     saveDB(); closeAllModals(); notify(section ? 'Раздел обновлён' : 'Раздел создан', 'success'); render();
//   });
//   document.body.appendChild(modal);
//   openModal('sectionModal');
//   $('sm_title')?.focus();
// }

// // /* ─── TOPIC MODAL ─── */
// // function openTopicModal(topicId = null) {
// //   const section = findSection(UI.activeSectionId);
// //   if (!section) return;
// //   const topic = topicId ? findTopic(UI.activeSectionId, topicId) : null;

// //   let tagsArr = [...(topic?.tags || [])];
// //   let difficulty = topic?.difficulty || 1;

// //   const modal = buildModal('topicModal', topic ? 'Редактировать тему' : 'Новая тема', `
// //     <div class="form-group">
// //       <label class="form-label">Название *</label>
// //       <input class="form-input" id="tm_title" value="${esc(topic?.title||'')}" placeholder="Название темы">
// //     </div>
// //     <div class="form-row">
// //       <div class="form-group">
// //         <label class="form-label">Статус</label>
// //         <select class="form-select" id="tm_status">
// //           <option value="learning" ${topic?.status==='learning'?'selected':''}>📘 Изучаю</option>
// //           <option value="review" ${topic?.status==='review'?'selected':''}>🔄 Повторить</option>
// //           <option value="done" ${topic?.status==='done'?'selected':''}>✅ Освоено</option>
// //         </select>
// //       </div>
// //       <div class="form-group">
// //         <label class="form-label">Приоритет</label>
// //         <select class="form-select" id="tm_priority">
// //           <option value="low" ${topic?.priority==='low'?'selected':''}>↓ Низкий</option>
// //           <option value="medium" ${topic?.priority==='medium'||!topic?.priority?'selected':''}>→ Средний</option>
// //           <option value="high" ${topic?.priority==='high'?'selected':''}>↑ Высокий</option>
// //         </select>
// //       </div>
// //     </div>
// //     <div class="form-row">
// //       <div class="form-group">
// //         <label class="form-label">Дата повторения</label>
// //         <input type="date" class="form-input" id="tm_lastReview" value="${topic?.lastReview||''}">
// //       </div>
// //       <div class="form-group">
// //         <label class="form-label">Дедлайн</label>
// //         <input type="date" class="form-input" id="tm_deadline" value="${topic?.deadline||''}">
// //       </div>
// //     </div>
// //     <div class="form-group">
// //       <label class="form-label">Сложность</label>
// //       <div class="difficulty-stars" id="starsWrap">
// //         ${[1,2,3,4,5].map(i=>`<button type="button" class="star-btn ${i<=difficulty?'on':'off'}" data-star="${i}">★</button>`).join('')}
// //       </div>
// //     </div>
// //     <div class="form-group">
// //       <label class="form-label">Теги</label>
// //       <div class="form-input tags-container" id="tagsContainer" style="min-height:40px;cursor:text">
// //         ${tagsArr.map(t=>`<span class="badge badge-tag">#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button></span>`).join('')}
// //         <input type="text" class="tags-input-field" id="tagsInput" placeholder="Добавить тег…">
// //       </div>
// //       <div class="form-hint">Нажмите Enter или запятую для добавления тега</div>
// //     </div>
// //     <div class="form-group">
// //       <label class="form-check">
// //         <input type="checkbox" id="tm_difficult" ${topic?.isDifficult?'checked':''}>
// //         <span class="form-check-label">⚠ Пометить как сложную тему</span>
// //       </label>
// //     </div>
// //   `, () => {
// //     const title = $('tm_title').value.trim();
// //     if (!title) { notify('Введите название темы', 'error'); return; }
// //     const data = {
// //       title,
// //       status: $('tm_status').value,
// //       priority: $('tm_priority').value,
// //       lastReview: $('tm_lastReview').value || null,
// //       deadline: $('tm_deadline').value || null,
// //       difficulty,
// //       tags: tagsArr,
// //       isDifficult: $('tm_difficult').checked,
// //     };
// //     if (topic) {
// //       Object.assign(topic, data);
// //     } else {
// //       if (!section.topics) section.topics = [];
// //       section.topics.push({ id: uid(), ...data, notes: '', links: [], tests: [], testHistory: [] });
// //     }
// //     saveDB(); closeAllModals(); notify(topic ? 'Тема обновлена' : 'Тема создана', 'success'); render();
// //   });

// //   document.body.appendChild(modal);
// //   openModal('topicModal');
// //   $('tm_title')?.focus();

// //   // Stars
// //   const starsWrap = $('starsWrap');
// //   starsWrap?.querySelectorAll('.star-btn').forEach(btn => {
// //     btn.addEventListener('click', () => {
// //       difficulty = parseInt(btn.dataset.star);
// //       starsWrap.querySelectorAll('.star-btn').forEach((b,i) => {
// //         b.className = `star-btn ${i < difficulty ? 'on' : 'off'}`;
// //       });
// //     });
// //   });

// //   // Tags
// //   const tagsContainer = $('tagsContainer');
// //   const tagsInput = $('tagsInput');

// //   function refreshTags() {
// //     tagsContainer.querySelectorAll('.badge').forEach(b => b.remove());
// //     tagsArr.forEach(t => {
// //       const badge = ce('span', { cls: 'badge badge-tag' });
// //       badge.innerHTML = `#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button>`;
// //       badge.querySelector('.tag-remove').addEventListener('click', () => {
// //         tagsArr = tagsArr.filter(x => x !== t);
// //         refreshTags();
// //       });
// //       tagsContainer.insertBefore(badge, tagsInput);
// //     });
// //   }

// //   tagsContainer?.addEventListener('click', () => tagsInput?.focus());
// //   tagsInput?.addEventListener('keydown', e => {
// //     if (e.key === 'Enter' || e.key === ',') {
// //       e.preventDefault();
// //       const val = tagsInput.value.trim().replace(/,/g,'');
// //       if (val && !tagsArr.includes(val)) { tagsArr.push(val); refreshTags(); }
// //       tagsInput.value = '';
// //     } else if (e.key === 'Backspace' && !tagsInput.value && tagsArr.length) {
// //       tagsArr.pop(); refreshTags();
// //     }
// //   });

// //   // Remove existing tag badges and re-render
// //   tagsContainer?.querySelectorAll('.badge').forEach(b => b.remove());
// //   refreshTags();
// // }
// /* ─── TOPIC MODAL ─── */
// function openTopicModal(topicId = null) {
//   const section = findSection(UI.activeSectionId);
//   if (!section) return;
//   const topic = topicId ? findTopic(UI.activeSectionId, topicId) : null;

//   // --- РАСЧЕТ ДАТ ПО УМОЛЧАНИЮ ---
//   const now = new Date();
  
//   // Завтра
//   const tomorrow = new Date(now);
//   tomorrow.setDate(now.getDate() + 1);
//   const tomorrowStr = tomorrow.toISOString().split('T')[0];

//   // Через 5 месяцев
//   const future = new Date(now);
//   future.setMonth(now.getMonth() + 5);
//   const deadlineStr = future.toISOString().split('T')[0];
//   // ------------------------------

//   let tagsArr = [...(topic?.tags || [])];
//   let difficulty = topic?.difficulty || 1;

//   const modal = buildModal('topicModal', topic ? 'Редактировать тему' : 'Новая тема', `
//     <div class="form-group">
//       <label class="form-label">Название *</label>
//       <input class="form-input" id="tm_title" value="${esc(topic?.title||'')}" placeholder="Название темы">
//     </div>
//     <div class="form-row">
//       <div class="form-group">
//         <label class="form-label">Статус</label>
//         <select class="form-select" id="tm_status">
//           <option value="learning" ${topic?.status==='learning'?'selected':''}>📘 Изучаю</option>
//           <option value="review" ${topic?.status==='review'?'selected':''}>🔄 Повторить</option>
//           <option value="done" ${topic?.status==='done'?'selected':''}>✅ Освоено</option>
//         </select>
//       </div>
//       <div class="form-group">
//         <label class="form-label">Приоритет</label>
//         <select class="form-select" id="tm_priority">
//           <option value="low" ${topic?.priority==='low'?'selected':''}>↓ Низкий</option>
//           <option value="medium" ${topic?.priority==='medium'||!topic?.priority?'selected':''}>→ Средний</option>
//           <option value="high" ${topic?.priority==='high'?'selected':''}>↑ Высокий</option>
//         </select>
//       </div>
//     </div>
//     <div class="form-row">
//       <div class="form-group">
//         <label class="form-label">Дата повторения</label>
//         <input type="date" class="form-input" id="tm_lastReview" value="${topic?.lastReview || tomorrowStr}">
//       </div>
//       <div class="form-group">
//         <label class="form-label">Дедлайн</label>
//         <input type="date" class="form-input" id="tm_deadline" value="${topic?.deadline || deadlineStr}">
//       </div>
//     </div>
//     <div class="form-group">
//       <label class="form-label">Сложность</label>
//       <div class="difficulty-stars" id="starsWrap">
//         ${[1,2,3,4,5].map(i=>`<button type="button" class="star-btn ${i<=difficulty?'on':'off'}" data-star="${i}">★</button>`).join('')}
//       </div>
//     </div>
//     <div class="form-group">
//       <label class="form-label">Теги</label>
//       <div class="form-input tags-container" id="tagsContainer" style="min-height:40px;cursor:text">
//         ${tagsArr.map(t=>`<span class="badge badge-tag">#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button></span>`).join('')}
//         <input type="text" class="tags-input-field" id="tagsInput" placeholder="Добавить тег…">
//       </div>
//       <div class="form-hint">Нажмите Enter или запятую для добавления тега</div>
//     </div>
//     <div class="form-group">
//       <label class="form-check">
//         <input type="checkbox" id="tm_difficult" ${topic?.isDifficult?'checked':''}>
//         <span class="form-check-label">⚠ Пометить как сложную тему</span>
//       </label>
//     </div>
//   `, () => {
//     const title = $('tm_title').value.trim();
//     if (!title) { notify('Введите название темы', 'error'); return; }
//     const data = {
//       title,
//       status: $('tm_status').value,
//       priority: $('tm_priority').value,
//       lastReview: $('tm_lastReview').value || null,
//       deadline: $('tm_deadline').value || null,
//       difficulty,
//       tags: tagsArr,
//       isDifficult: $('tm_difficult').checked,
//     };
//     if (topic) {
//       Object.assign(topic, data);
//     } else {
//       if (!section.topics) section.topics = [];
//       section.topics.push({ id: uid(), ...data, notes: '', links: [], tests: [], testHistory: [] });
//     }
//     saveDB(); closeAllModals(); notify(topic ? 'Тема обновлена' : 'Тема создана', 'success'); render();
//   });

//   document.body.appendChild(modal);
//   openModal('topicModal');
//   $('tm_title')?.focus();

//   // Stars
//   const starsWrap = $('starsWrap');
//   starsWrap?.querySelectorAll('.star-btn').forEach(btn => {
//     btn.addEventListener('click', () => {
//       difficulty = parseInt(btn.dataset.star);
//       starsWrap.querySelectorAll('.star-btn').forEach((b,i) => {
//         b.className = `star-btn ${i < difficulty ? 'on' : 'off'}`;
//       });
//     });
//   });

//   // Tags
//   const tagsContainer = $('tagsContainer');
//   const tagsInput = $('tagsInput');

//   function refreshTags() {
//     tagsContainer.querySelectorAll('.badge').forEach(b => b.remove());
//     tagsArr.forEach(t => {
//       const badge = ce('span', { cls: 'badge badge-tag' });
//       badge.innerHTML = `#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button>`;
//       badge.querySelector('.tag-remove').addEventListener('click', () => {
//         tagsArr = tagsArr.filter(x => x !== t);
//         refreshTags();
//       });
//       tagsContainer.insertBefore(badge, tagsInput);
//     });
//   }

//   tagsContainer?.addEventListener('click', () => tagsInput?.focus());
//   tagsInput?.addEventListener('keydown', e => {
//     if (e.key === 'Enter' || e.key === ',') {
//       e.preventDefault();
//       const val = tagsInput.value.trim().replace(/,/g,'');
//       if (val && !tagsArr.includes(val)) { tagsArr.push(val); refreshTags(); }
//       tagsInput.value = '';
//     } else if (e.key === 'Backspace' && !tagsInput.value && tagsArr.length) {
//       tagsArr.pop(); refreshTags();
//     }
//   });

//   tagsContainer?.querySelectorAll('.badge').forEach(b => b.remove());
//   refreshTags();
// }
// /* ─── LINK MODAL ─── */
// function openLinkModal(sectionId, topicId, linkId = null) {
//   const topic = findTopic(sectionId, topicId);
//   if (!topic) return;
//   const link = linkId ? topic.links?.find(l => l.id === linkId) : null;

//   const modal = buildModal('linkModal', link ? 'Редактировать ссылку' : 'Добавить ссылку', `
//     <div class="form-group">
//       <label class="form-label">Название *</label>
//       <input class="form-input" id="lm_title" value="${esc(link?.title||'')}" placeholder="Название ресурса">
//     </div>
//     <div class="form-group">
//       <label class="form-label">URL *</label>
//       <input class="form-input" id="lm_url" value="${esc(link?.url||'')}" placeholder="https://..." type="url">
//     </div>
//     <div class="form-group">
//       <label class="form-label">Примечание</label>
//       <input class="form-input" id="lm_note" value="${esc(link?.note||'')}" placeholder="Краткое описание">
//     </div>
//   `, () => {
//     const title = $('lm_title').value.trim();
//     const url   = $('lm_url').value.trim();
//     if (!title || !url) { notify('Заполните название и URL', 'error'); return; }
//     if (!topic.links) topic.links = [];
//     if (link) {
//       link.title = title; link.url = url; link.note = $('lm_note').value.trim();
//     } else {
//       topic.links.push({ id: uid(), title, url, note: $('lm_note').value.trim() });
//     }
//     saveDB(); closeAllModals(); notify(link ? 'Ссылка обновлена' : 'Ссылка добавлена', 'success'); render();
//   });

//   document.body.appendChild(modal);
//   openModal('linkModal');
//   $('lm_title')?.focus();
// }

// /* ─── TEST MODAL ─── */
// // function openTestModal(sectionId, topicId, testId = null) {
// //   const topic = findTopic(sectionId, topicId);
// //   if (!topic) return;
// //   const test = testId ? topic.tests?.find(t => t.id === testId) : null;

// //   const modal = buildModal('testModal', test ? 'Редактировать вопрос' : 'Новый вопрос', `
// //     <div class="form-group">
// //       <label class="form-label">Вопрос *</label>
// //       <textarea class="form-textarea" id="qm_question" rows="2" placeholder="Текст вопроса">${esc(test?.question||'')}</textarea>
// //     </div>
// //     ${[0,1,2,3].map(i => `
// //       <div class="form-group">
// //         <label class="form-label">Вариант ${String.fromCharCode(65+i)} ${i===0?'*':''}</label>
// //         <input class="form-input" id="qm_opt${i}" value="${esc(test?.options?.[i]||'')}" placeholder="Вариант ответа ${String.fromCharCode(65+i)}">
// //       </div>
// //     `).join('')}
// //     <div class="form-group">
// //       <label class="form-label">Правильный ответ *</label>
// //       <select class="form-select" id="qm_correct">
// //         ${[0,1,2,3].map(i=>`<option value="${i}" ${test?.correct===i?'selected':''}>Вариант ${String.fromCharCode(65+i)}</option>`).join('')}
// //       </select>
// //     </div>
// //     <div class="form-group">
// //       <label class="form-label">Объяснение (показывается после ответа)</label>
// //       <textarea class="form-textarea" id="qm_expl" rows="2" placeholder="Почему этот ответ правильный...">${esc(test?.explanation||'')}</textarea>
// //     </div>
// //   `, () => {
// //     const question = $('qm_question').value.trim();
// //     const opts = [0,1,2,3].map(i => $('qm_opt'+i).value.trim());
// //     if (!question) { notify('Введите вопрос', 'error'); return; }
// //     if (opts.some(o => !o)) { notify('Заполните все варианты ответа', 'error'); return; }
// //     const correct = parseInt($('qm_correct').value);
// //     const explanation = $('qm_expl').value.trim();
// //     if (!topic.tests) topic.tests = [];
// //     if (test) {
// //       test.question = question; test.options = opts; test.correct = correct; test.explanation = explanation;
// //     } else {
// //       topic.tests.push({ id: uid(), question, options: opts, correct, explanation, history: [] });
// //     }
// //     saveDB(); closeAllModals(); notify(test ? 'Вопрос обновлён' : 'Вопрос добавлен', 'success'); render();
// //   });

// //   document.body.appendChild(modal);
// //   openModal('testModal');
// //   $('qm_question')?.focus();
// // }

// /* ─── ОБНОВЛЕННЫЙ TEST MODAL ─── */
// /* ─── ОБНОВЛЕННЫЙ TEST MODAL (С НОВЫМ ДИЗАЙНОМ) ─── */
// function openTestModal(sectionId, topicId, testId = null) {
//   const topic = findTopic(sectionId, topicId);
//   if (!topic) return;
//   const test = testId ? topic.tests?.find(t => t.id === testId) : null;

//   // Новый компактный дизайн для строки варианта ответа
//   const renderOptionRow = (val = '', isCorrect = false) => `
//     <div class="option-row modern-option-row">
//       <label class="modern-option-checkbox" title="Отметить как правильный">
//         <input type="checkbox" class="qm_correct_check" ${isCorrect ? 'checked' : ''}>
//         <span class="custom-checkbox"></span>
//       </label>
//       <div class="modern-option-input-wrapper">
//         <input class="qm_opt" value="${esc(val)}" placeholder="Введите вариант ответа...">
//       </div>
//       <button type="button" class="modern-option-delete" onclick="this.parentElement.remove()" title="Удалить вариант">✕</button>
//     </div>
//   `;

//   const initialOptions = test?.options || ['', '', '', ''];
//   const correctArr = Array.isArray(test?.correct) ? test.correct : (test?.correct !== undefined ? [test.correct] : []);

//   const modal = buildModal('testModal', test ? 'Редактировать вопрос' : 'Новый вопрос', `
//     <div class="form-group">
//       <label class="form-label">Вопрос *</label>
//       <textarea class="form-textarea" id="qm_question" rows="2" placeholder="Текст вопроса">${esc(test?.question || '')}</textarea>
//     </div>
    
//     <label class="form-label" style="margin-top: 12px; display: block;">Варианты ответов (отметьте правильные галочкой) *</label>
//     <div id="options_container">
//       ${initialOptions.map((opt, i) => renderOptionRow(opt, correctArr.includes(i))).join('')}
//     </div>
    
//     <button type="button" id="add_option_btn" class="btn btn-secondary btn-sm" style="margin-top: 4px;">+ Добавить вариант</button>

//     <div class="form-group" style="margin-top: 20px;">
//       <label class="form-label">Объяснение (показывается после ответа)</label>
//       <textarea class="form-textarea" id="qm_expl" rows="2" placeholder="Почему эти ответы правильные...">${esc(test?.explanation || '')}</textarea>
//     </div>
//   `, () => {
//     // ЛОГИКА СОХРАНЕНИЯ
//     const question = $('qm_question').value.trim();
//     const rows = document.querySelectorAll('.option-row');
    
//     const opts = [];
//     const correct = [];

//     rows.forEach((row) => {
//       const text = row.querySelector('.qm_opt').value.trim();
//       const isCorrect = row.querySelector('.qm_correct_check').checked;
//       if (text) {
//         opts.push(text);
//         if (isCorrect) correct.push(opts.length - 1);
//       }
//     });

//     if (!question) { notify('Введите вопрос', 'error'); return; }
//     if (opts.length < 2) { notify('Нужно минимум 2 варианта ответа', 'error'); return; }
//     if (correct.length === 0) { notify('Выберите хотя бы один правильный ответ', 'error'); return; }

//     if (!topic.tests) topic.tests = [];
    
//     const testData = {
//       id: test ? test.id : uid(),
//       question,
//       options: opts,
//       correct: correct,
//       explanation: $('qm_expl').value.trim(),
//       history: test ? (test.history || []) : []
//     };

//     if (test) {
//       Object.assign(test, testData);
//     } else {
//       topic.tests.push(testData);
//     }

//     saveDB(); closeAllModals(); notify(test ? 'Вопрос обновлён' : 'Вопрос добавлен', 'success'); render();
//   });

//   document.body.appendChild(modal);
  
//   $('add_option_btn').onclick = () => {
//     const container = $('options_container');
//     const div = document.createElement('div');
//     div.innerHTML = renderOptionRow();
//     container.appendChild(div.firstElementChild);
//   };

//   openModal('testModal');
//   $('qm_question')?.focus();
// }
// /* ─── IMPORT TESTS MODAL (ДЛЯ НЕЙРОСЕТЕЙ) ─── */
// function openImportTestsModal(sectionId, topicId) {
//   const topic = findTopic(sectionId, topicId);
//   if (!topic) return;

//   const modal = buildModal('importTestsModal', 'Импорт вопросов (JSON)', `
//     <div class="form-group">
//       <label class="form-label">Вставьте JSON от нейросети *</label>
//       <textarea class="form-textarea" id="im_tests_json" rows="12" style="font-family: monospace; font-size: 13px; white-space: pre;" placeholder='[
//   {
//     "question": "Текст вопроса?",
//     "options": ["Вариант А", "Вариант Б", "Вариант В"],
//     "correct": [0],
//     "explanation": "Объяснение ответа"
//   }
// ]'></textarea>
//     </div>
//     <div class="form-hint" style="margin-top: 8px;">
//       Скопируйте специальный промпт для нейросети, чтобы она выдала правильный формат.
//     </div>
//   `, () => {
//     const val = $('im_tests_json').value.trim();
//     if (!val) { notify('Вставьте код', 'error'); return; }
    
//     try {
//       // Пытаемся прочитать JSON
//       const parsed = JSON.parse(val);
//       if (!Array.isArray(parsed)) throw new Error('Код должен начинаться с [ и заканчиваться ] (массив)');

//       let added = 0;
//       if (!topic.tests) topic.tests = [];

//       // Проходим по каждому вопросу от ИИ
//       parsed.forEach(item => {
//         // Базовая валидация: есть вопрос, есть варианты, есть правильные ответы
//         if (item.question && Array.isArray(item.options) && Array.isArray(item.correct)) {
//           topic.tests.push({
//             id: uid(), // Генерируем уникальный ID для каждого
//             question: item.question,
//             options: item.options,
//             correct: item.correct, // Массив индексов (например [0, 2])
//             explanation: item.explanation || '',
//             history: []
//           });
//           added++;
//         }
//       });

//       if (added > 0) {
//         saveDB(); 
//         closeAllModals(); 
//         notify(`Успешно добавлено вопросов: ${added}`, 'success'); 
//         render();
//       } else {
//         notify('Формат верный, но вопросы не найдены. Проверьте структуру.', 'warning');
//       }
//     } catch (e) {
//       notify('Ошибка чтения JSON: проверьте, нет ли лишних символов.', 'error');
//       console.error(e);
//     }
//   });

//   document.body.appendChild(modal);
//   openModal('importTestsModal');
// }


// /* ─── ОБНОВЛЕННЫЙ EXAM QUESTION (С ОБРАТНОЙ СВЯЗЬЮ) ─── */
// // function renderExamQuestion(view) {
// //   if (!UI.examState) return;

// //   const { questions, current, currentAnswerRevealed, lastSelectedIndices } = UI.examState;
// //   const q = questions[current];
// //   const isLastQuestion = current === questions.length - 1;

// //   view.innerHTML = `
// //     <div class="view-header" style="margin-bottom:8px">
// //       <div><div class="view-title">🎓 Экзамен</div></div>
// //       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
// //     </div>
// //     <div class="exam-container">
// //       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
// //         <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
// //         <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
// //       </div>
// //       <div class="exam-progress-bar">
// //         <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
// //       </div>
      
// //       <div class="exam-question-card" style="margin-top: 16px;">
// //         <div class="exam-question-text">${esc(q.question)}</div>
// //         <div class="test-options" id="exam_opts"></div>
        
// //         <div class="test-explanation" id="exam_expl" style="margin-top: 16px; ${currentAnswerRevealed && q.explanation ? 'display:block; opacity:1; visibility:visible; padding:12px; background:var(--accent-dim); border-left:3px solid var(--accent); border-radius:var(--radius-md); font-size:13px;' : 'display:none;'}">
// //           <strong>Объяснение:</strong><br>
// //           ${esc(q.explanation || '')}
// //         </div>
        
// //         <div style="margin-top: 20px;">
// //           ${!currentAnswerRevealed 
// //             ? `<button class="btn btn-primary" id="btnCheckExam" style="width: 100%">Подтвердить ответ</button>`
// //             : `<button class="btn btn-primary" id="btnNextExam" style="width: 100%">${isLastQuestion ? 'Завершить экзамен ✓' : 'Следующий вопрос →'}</button>`
// //           }
// //         </div>
// //       </div>
// //     </div>
// //   `;

// //   $('btnExitExam')?.addEventListener('click', () => {
// //     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
// //   });

// //   const optsDiv = $('exam_opts');
  
// //   q.shuffledOptions.forEach((optText, i) => {
// //     const btn = ce('button', { cls: 'test-option' });
// //     btn.dataset.idx = i;
    
// //     btn.innerHTML = `
// //       <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
// //       <span class="test-opt-text">${esc(optText)}</span>
// //     `;
    
// //     if (currentAnswerRevealed) {
// //       // Режим просмотра результата ответа
// //       btn.disabled = true;
// //       const isCorrectAns = q.newCorrectIndices.includes(i);
// //       const isSelected = lastSelectedIndices.includes(i);
      
// //       if (isCorrectAns) {
// //         btn.classList.add('correct'); // Зеленый для всех правильных
// //       }
// //       if (isSelected && !isCorrectAns) {
// //         btn.classList.add('wrong');   // Красный для ошибочно выбранных
// //       }
// //     } else {
// //       // Режим выбора ответа
// //       btn.onclick = () => btn.classList.toggle('selected');
// //     }
    
// //     optsDiv.appendChild(btn);
// //   });

// //   // Логика кнопок
// //   if (!currentAnswerRevealed) {
// //     $('btnCheckExam').onclick = () => {
// //       const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
// //       const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

// //       if (selectedIndices.length === 0) {
// //         notify('Выберите хотя бы один вариант', 'warning');
// //         return;
// //       }
// //       handleExamAnswer(selectedIndices);
// //     };
// //   } else {
// //     $('btnNextExam').onclick = () => {
// //       UI.examState.current++;
// //       UI.examState.currentAnswerRevealed = false; // Сбрасываем флаг для следующего вопроса
// //       UI.examState.lastSelectedIndices = [];
      
// //       if (UI.examState.current >= questions.length) {
// //         UI.examState.finished = true;
// //       }
// //       render();
// //     };
// //   }
// // }

// /* ─── ОБНОВЛЕННЫЙ EXAM QUESTION (С УМНОЙ ОБРАТНОЙ СВЯЗЬЮ) ─── */
// function renderExamQuestion(view) {
//   if (!UI.examState) return;

//   const { questions, current, currentAnswerRevealed, lastSelectedIndices } = UI.examState;
//   const q = questions[current];
//   const isLastQuestion = current === questions.length - 1;

//   // Переменные для текста и цвета обратной связи
//   let feedbackMsg = '';
//   let feedbackColor = '';
//   let isPerfectMatch = false;
//   let hasIncorrect = false;
//   let hasMissed = false;

//   // Анализируем ответ, если он уже дан
//   if (currentAnswerRevealed) {
//     const correctArr = q.newCorrectIndices;
//     const selectedArr = lastSelectedIndices || [];

//     // 1. Выбраны ВСЕ правильные и НИ ОДНОГО неправильного
//     isPerfectMatch = selectedArr.length === correctArr.length && selectedArr.every(i => correctArr.includes(i));
//     // 2. Выбран хотя бы один НЕПРАВИЛЬНЫЙ вариант
//     hasIncorrect = selectedArr.some(i => !correctArr.includes(i));
//     // 3. Выбраны только правильные, но НЕ ВСЕ
//     hasMissed = correctArr.some(i => !selectedArr.includes(i)) && !hasIncorrect;

//     if (isPerfectMatch) {
//       feedbackMsg = '✅ Абсолютно верно!';
//       feedbackColor = '#10b981'; // Зеленый
//     } else if (hasIncorrect) {
//       feedbackMsg = '❌ Некоторые варианты выбраны неверно.';
//       feedbackColor = '#ef4444'; // Красный
//     } else if (hasMissed) {
//       feedbackMsg = '⚠️ Выбраны не все правильные варианты.';
//       feedbackColor = '#f59e0b'; // Оранжевый
//     }
//   }

//   view.innerHTML = `
//     <style>
//       /* Добавляем стили для оранжевого "неполного" ответа */
//       .test-option.warning {
//         border-color: #f59e0b !important;
//         background: rgba(245, 158, 11, 0.1) !important;
//       }
//       .test-option.warning .test-opt-letter {
//         background: #f59e0b !important;
//         color: #fff !important;
//         border-color: #f59e0b !important;
//       }
//     </style>
    
//     <div class="view-header" style="margin-bottom:8px">
//       <div><div class="view-title">🎓 Экзамен</div></div>
//       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
//     </div>
    
//     <div class="exam-container">
//       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
//         <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
//         <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
//       </div>
//       <div class="exam-progress-bar">
//         <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
//       </div>
      
//       <div class="exam-question-card" style="margin-top: 16px;">
//         <div class="exam-question-text">${esc(q.question)}</div>
//         <div class="test-options" id="exam_opts"></div>
        
//         ${currentAnswerRevealed ? `
//           <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 4px solid ${feedbackColor}; animation: fadeIn 0.3s ease;">
//             <div style="font-weight: bold; color: ${feedbackColor}; margin-bottom: ${q.explanation ? '8px' : '0'}">
//               ${feedbackMsg}
//             </div>
//             ${q.explanation ? `<div style="font-size: 13px; color: var(--text-main);"><strong>Объяснение:</strong><br>${esc(q.explanation)}</div>` : ''}
//           </div>
//         ` : ''}
        
//         <div style="margin-top: 20px;">
//           ${!currentAnswerRevealed 
//             ? `<button class="btn btn-primary" id="btnCheckExam" style="width: 100%">Подтвердить ответ</button>`
//             : `<button class="btn btn-primary" id="btnNextExam" style="width: 100%">${isLastQuestion ? 'Завершить экзамен ✓' : 'Следующий вопрос →'}</button>`
//           }
//         </div>
//       </div>
//     </div>
//   `;

//   $('btnExitExam')?.addEventListener('click', () => {
//     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
//   });

//   const optsDiv = $('exam_opts');
  
//   q.shuffledOptions.forEach((optText, i) => {
//     const btn = ce('button', { cls: 'test-option' });
//     btn.dataset.idx = i;
    
//     btn.innerHTML = `
//       <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
//       <span class="test-opt-text">${esc(optText)}</span>
//     `;
    
//     if (currentAnswerRevealed) {
//       btn.disabled = true;
//       const isCorrectAns = q.newCorrectIndices.includes(i);
//       const isSelected = lastSelectedIndices.includes(i);
      
//       // ЛОГИКА РАСКРАСКИ КНОПОК
//       if (isPerfectMatch) {
//         if (isCorrectAns) btn.classList.add('correct'); // Всё идеально - зеленые
//       } else if (hasIncorrect) {
//         if (isSelected && !isCorrectAns) btn.classList.add('wrong'); // Выбрал ошибку - красная
//         if (isCorrectAns) btn.classList.add('correct'); // Показываем правильные - зелеными
//       } else if (hasMissed) {
//         if (isCorrectAns) btn.classList.add('warning'); // Забыл выбрать - оранжевые
//       }

//       // Сохраняем визуальное выделение рамкой для тех, куда кликал юзер
//       if (isSelected) btn.classList.add('selected');

//     } else {
//       // Режим выбора ответа
//       btn.onclick = () => btn.classList.toggle('selected');
//     }
    
//     optsDiv.appendChild(btn);
//   });

//   // Обработчики кнопок
//   if (!currentAnswerRevealed) {
//     $('btnCheckExam').onclick = () => {
//       const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
//       const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

//       if (selectedIndices.length === 0) {
//         notify('Выберите хотя бы один вариант', 'warning');
//         return;
//       }
//       // handleExamAnswer уже есть у вас в коде, он обработает данные
//       handleExamAnswer(selectedIndices);
//     };
//   } else {
//     $('btnNextExam').onclick = () => {
//       UI.examState.current++;
//       UI.examState.currentAnswerRevealed = false; // Сбрасываем флаг
//       UI.examState.lastSelectedIndices = [];
      
//       if (UI.examState.current >= questions.length) {
//         UI.examState.finished = true;
//       }
//       render();
//     };
//   }
// }

// /* ─── ИЗМЕНЕННЫЙ HANDLE EXAM ANSWER ─── */
// function handleExamAnswer(userIndices) {
//   const { questions, current } = UI.examState;
//   const q = questions[current];
  
//   const correctArr = q.newCorrectIndices;
//   const isCorrect = userIndices.length === correctArr.length && 
//                     userIndices.every(idx => correctArr.includes(idx));

//   UI.examState.answers.push(isCorrect);
//   if (isCorrect) UI.examState.score++;

//   const origTopic = findTopic(q._sectionId, q._topicId);
//   if (origTopic) {
//     const origQ = origTopic.tests?.find(t => t.id === q.id);
//     if (origQ) {
//       if (!origQ.history) origQ.history = [];
//       origQ.history.push({ date: today(), correct: isCorrect });
//       saveDB();
//     }
//   }

//   // Вместо перехода к следующему вопросу, включаем режим "показа ответа"
//   UI.examState.currentAnswerRevealed = true;
//   UI.examState.lastSelectedIndices = userIndices;
  
//   render(); 
// }


// /* ─── MODAL BUILDER ─── */
// function buildModal(id, title, bodyHTML, onSave) {
//   // Remove existing modal with same id
//   document.getElementById(id)?.remove();

//   const overlay = ce('div', { id, cls: 'modal-overlay' });
//   const modal = ce('div', { cls: 'modal modal-lg' });
//   modal.innerHTML = `
//     <div class="modal-header">
//       <span class="modal-title">${esc(title)}</span>
//       <button class="modal-close" type="button">×</button>
//     </div>
//     <div class="modal-body">${bodyHTML}</div>
//     <div class="modal-footer">
//       <button class="btn btn-ghost" id="${id}_cancel">Отмена</button>
//       <button class="btn btn-primary" id="${id}_save">💾 Сохранить</button>
//     </div>
//   `;
//   overlay.appendChild(modal);

//   overlay.querySelector('.modal-close')?.addEventListener('click', () => closeModal(id));
//   overlay.querySelector(`#${id}_cancel`)?.addEventListener('click', () => closeModal(id));
//   overlay.querySelector(`#${id}_save`)?.addEventListener('click', onSave);
//   overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(id); });

//   // Enter to save
//   overlay.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) onSave(); });

//   return overlay;
// }

// /* ═══════════════════════════════════════════════════
//    CRUD OPERATIONS
// ═══════════════════════════════════════════════════ */
// function deleteSection(sectionId) {
//   if (!confirm(`Удалить раздел «${findSection(sectionId)?.title}» и все темы?`)) return;
//   DB.sections = DB.sections.filter(s => s.id !== sectionId);
//   if (UI.activeSectionId === sectionId) { UI.activeSectionId = null; UI.activeTopicId = null; UI.view = 'home'; }
//   saveDB(); notify('Раздел удалён', 'success'); render();
// }

// function deleteTopic(sectionId, topicId) {
//   const section = findSection(sectionId);
//   if (!section || !confirm(`Удалить тему «${findTopic(sectionId, topicId)?.title}»?`)) return;
//   section.topics = section.topics.filter(t => t.id !== topicId);
//   if (UI.activeTopicId === topicId) { UI.activeTopicId = null; UI.view = 'section'; }
//   saveDB(); notify('Тема удалена', 'success'); render();
// }

// /* ═══════════════════════════════════════════════════
//    EXPORT / IMPORT / RESET
// ═══════════════════════════════════════════════════ */
// function exportData() {
//   const json = JSON.stringify(DB, null, 2);
//   const blob = new Blob([json], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = `pkb2-export-${today()}.json`;
//   a.click();
//   URL.revokeObjectURL(url);
//   notify('Данные экспортированы', 'success');
// }

// function importData() {
//   const input = document.createElement('input');
//   input.type = 'file'; input.accept = '.json';
//   input.onchange = e => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = ev => {
//       try {
//         const parsed = JSON.parse(ev.target.result);
//         if (!parsed.sections) throw new Error('Неверный формат файла');
//         if (!confirm('Заменить текущие данные импортированными?')) return;
//         DB = parsed;
//         saveDB();
//         notify('Данные импортированы', 'success');
//         UI.view = 'home'; UI.activeSectionId = null; UI.activeTopicId = null;
//         render();
//       } catch(err) { notify('Ошибка импорта: ' + err.message, 'error'); }
//     };
//     reader.readAsText(file);
//   };
//   input.click();
// }

// async function resetData() {
//   if (!confirm('Сбросить все данные к исходным? Текущие данные будут потеряны!')) return;
//   try {
//     const res = await fetch('data.json');
//     DB = await res.json();
//     saveDB();
//     notify('Данные сброшены к исходным', 'success');
//     UI.view = 'home'; UI.activeSectionId = null; UI.activeTopicId = null;
//     render();
//   } catch(e) { notify('Не удалось загрузить data.json', 'error'); }
// }

// /* ═══════════════════════════════════════════════════
//    GLOBAL EVENT BINDING
// ═══════════════════════════════════════════════════ */
// function bindGlobalEvents() {
//   // Sidebar toggle
//   $('btnSidebar')?.addEventListener('click', () => {
//     UI.sidebarCollapsed = !UI.sidebarCollapsed;
//     DB.settings = DB.settings || {};
//     DB.settings.sidebarCollapsed = UI.sidebarCollapsed;
//     saveDB(); render();
//   });

//   // Theme toggle
//   $('btnTheme')?.addEventListener('click', () => {
//     DB.settings = DB.settings || {};
//     DB.settings.darkMode = !(DB.settings.darkMode !== false);
//     saveDB(); applyTheme();
//   });

//   // Navigation buttons
//   $('navHome')?.addEventListener('click',  () => { UI.view = 'home';       render(); });
//   $('navRep')?.addEventListener('click',   () => { UI.view = 'repetition'; render(); });
//   $('navExam')?.addEventListener('click',  () => { UI.view = 'exam';  UI.examState = null; render(); });
//   $('navSearch')?.addEventListener('click',() => { UI.view = 'search';     render(); });

//   // Export/Import/Reset in topbar
//   $('btnExport')?.addEventListener('click', exportData);
//   $('btnImport')?.addEventListener('click', importData);

//   // Search
//   let searchTimer;
//   $('searchInput')?.addEventListener('input', e => {
//     clearTimeout(searchTimer);
//     UI.searchQuery = e.target.value;
//     searchTimer = setTimeout(() => {
//       if (UI.searchQuery.trim()) { UI.view = 'search'; render(); }
//     }, 280);
//   });
//   $('searchInput')?.addEventListener('keydown', e => {
//     if (e.key === 'Enter' && UI.searchQuery.trim()) { UI.view = 'search'; render(); }
//   });
//   // Добавляем фиктивное состояние
// history.pushState(null, null, location.href);

// window.addEventListener("popstate", function () {
//   const confirmExit = confirm("Вы точно хотите выйти?");
  
//   if (confirmExit) {
//     window.history.back();
//   } else {
//     history.pushState(null, null, location.href);
//   }
// });
// }



// // Сгенерируй 20 тестовых не простых вопросов по теме "[]".
// // Могут быть вопросы как с одним, так и с несколькими правильными вариантами ответов.
// // Выдай результат СТРОГО в формате чистого JSON-массива без форматирования Markdown, без лишнего текста до или после.
// // Индексы в массиве correct должны начинаться с 0.
// // Структура должна быть такой:
// // [
// // {
// // "question": "Текст вопроса",
// // "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"], "Вариант 5"],
// // "correct": [0, 2],
// // "explanation": "Почему именно эти варианты правильные (по простому)" 
// // }
// // ]

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
  // examConfig: { sectionId: null, count: 10 },
  examConfig: { sectionId: null, topicId: null, count: 10 },
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

/* ─── СВАЙП ДЛЯ ЗАКРЫТИЯ САЙДБАРА ─── */
(function() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let touchStartX = 0;
  let touchStartY = 0;

  // Начало касания
  sidebar.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  // Конец касания
  sidebar.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const diffX = touchStartX - touchEndX; // Сдвиг по горизонтали
    const diffY = Math.abs(touchStartY - touchEndY); // Сдвиг по вертикали

    // Если сдвинули влево больше чем на 50px 
    // и это было именно горизонтальное движение (diffX > diffY)
    if (diffX > 50 && diffX > diffY) {
      // Проверяем, не закрыт ли он уже
      if (!UI.sidebarCollapsed) {
        UI.sidebarCollapsed = true; // Устанавливаем состояние "закрыто"
        render(); // Перерисовываем интерфейс (кнопка в TOPBAR сама поменяется на ▶)
      }
    }
  }, { passive: true });
})();

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
    case 'repetition':  renderFlashcardView(); break;
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
        <div class="view-subtitle">Время на исходе</div>
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

// /* ─── LINKS PANEL ─── */
// function renderLinksPanel(section, topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
//       <button class="btn btn-primary btn-sm" id="btnAddLink">+ Ссылка</button>
//     </div>
//     <div class="links-list" id="linksList"></div>
//   `;
//   container.appendChild(panel);

//   $('btnAddLink')?.addEventListener('click', () => openLinkModal(section.id, topic.id));

//   const list = $('linksList');
//   const links = topic.links || [];
//   if (!links.length) {
//     list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">Нет ссылок</div></div>`;
//     return;
//   }
//   links.forEach(link => {
//     const isYT = link.url?.includes('youtube') || link.url?.includes('youtu.be');
//     const card = ce('div', { cls: 'link-card' });
//     card.innerHTML = `
//       <span class="link-favicon">${isYT ? '▶️' : '🌐'}</span>
//       <div class="link-info">
//         <div class="link-title">${esc(link.title)}</div>
//         <div class="link-url">${esc(link.url)}</div>
//         ${link.note ? `<div class="link-note">${esc(link.note)}</div>` : ''}
//       </div>
//       <div class="link-actions">
//         <a href="${esc(link.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Открыть ↗</a>
//         <button class="ibtn btn-edit-link" data-lid="${link.id}">✏️</button>
//         <button class="ibtn danger btn-del-link" data-lid="${link.id}">🗑️</button>
//       </div>
//     `;
//     card.querySelector(`[data-lid="${link.id}"].btn-edit-link`)?.addEventListener('click', () => openLinkModal(section.id, topic.id, link.id));
//     card.querySelector(`[data-lid="${link.id}"].btn-del-link`)?.addEventListener('click', () => {
//       if (!confirm('Удалить ссылку?')) return;
//       topic.links = links.filter(l => l.id !== link.id);
//       saveDB(); notify('Ссылка удалена'); render();
//     });
//     list.appendChild(card);
//   });
// }
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
    
    // Вносим изменения здесь:
    // 1. .link-title теперь тег <a> с атрибутами для открытия в новой вкладке
    // 2. Из .link-actions удалена кнопка "Открыть"
    card.innerHTML = `
      <span class="link-favicon">${isYT ? '▶️' : '🌐'}</span>
      <div class="link-info">
        <a href="${esc(link.url)}" target="_blank" rel="noopener" class="link-title" style="text-decoration:none; color:inherit; cursor:pointer; display:block;">
          ${esc(link.title)} ↗
        </a>
        <div class="link-url">${esc(link.url)}</div>
        ${link.note ? `<div class="link-note">${esc(link.note)}</div>` : ''}
      </div>
      <div class="link-actions">
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
// function renderTestsPanel(section, topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div class="tests-toolbar">
//       <button class="btn btn-success btn-sm" id="btnRunTests">▶ Пройти тест</button>
//       <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
//     </div>
//     <div class="tests-list" id="testsList"></div>
//   `;
//   container.appendChild(panel);

//   $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
//   $('btnRunTests')?.addEventListener('click', () => {
//     // Run inline quiz — reset all questions
//     $$('.test-option').forEach(o => {
//       o.disabled = false;
//       o.className = 'test-option';
//     });
//     $$('.test-explanation').forEach(e => e.classList.remove('visible'));
//     notify('Тест сброшен — отвечайте на вопросы!', 'info');
//   });

//   const list = $('testsList');
//   const tests = topic.tests || [];
//   if (!tests.length) {
//     list.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-title">Нет вопросов</div><div class="empty-desc">Добавьте вопросы для самопроверки</div></div>`;
//     return;
//   }

//   tests.forEach(q => {
//     const card = ce('div', { cls: 'test-card', id: `tc_${q.id}` });
//     const history = q.history || [];
//     const lastAttempts = history.slice(-5);
//     const shuffledIdx = shuffle([0,1,2,3]);
//     const displayOptions = shuffledIdx.map(i => ({ text: q.options[i], origIdx: i }));
//     const newCorrectIdx = displayOptions.findIndex(o => o.origIdx === q.correct);

//     card.innerHTML = `
//       <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
//         <div class="test-question">${esc(q.question)}</div>
//         <div style="display:flex;gap:3px;flex-shrink:0">
//           <button class="ibtn btn-edit-test" data-qid="${q.id}">✏️</button>
//           <button class="ibtn danger btn-del-test" data-qid="${q.id}">🗑️</button>
//         </div>
//       </div>
//       <div class="test-options" id="opts_${q.id}"></div>
//       <div class="test-explanation" id="expl_${q.id}">${esc(q.explanation || '')}</div>
//       <div class="test-footer">
//         <div class="test-history">
//           ${lastAttempts.map(a => `<span class="test-attempt ${a.correct?'pass':'fail'}">${a.correct?'✓':'✗'}</span>`).join('')}
//         </div>
//         <span class="text-muted text-sm">${history.length > 0 ? Math.round(history.filter(h=>h.correct).length/history.length*100)+'% верно' : 'Нет попыток'}</span>
//       </div>
//     `;

//     const optsDiv = card.querySelector(`#opts_${q.id}`);
//     displayOptions.forEach((opt, dispIdx) => {
//       const letters = ['A','B','C','D'];
//       const btn = ce('button', { cls: 'test-option' });
//       btn.innerHTML = `<span class="test-opt-letter">${letters[dispIdx]}</span><span class="test-opt-text">${esc(opt.text)}</span>`;
//       btn.addEventListener('click', () => {
//         // Disable all options
//         optsDiv.querySelectorAll('.test-option').forEach((b, i) => {
//           b.disabled = true;
//           if (i === newCorrectIdx) b.classList.add('correct');
//         });
//         if (dispIdx !== newCorrectIdx) btn.classList.add('wrong');
//         const correct = dispIdx === newCorrectIdx;
//         // Save history
//         if (!q.history) q.history = [];
//         q.history.push({ date: today(), correct });
//         saveDB();
//         // Show explanation
//         const expl = card.querySelector(`#expl_${q.id}`);
//         if (expl && q.explanation) expl.classList.add('visible');
//       });
//       optsDiv.appendChild(btn);
//     });

//     card.querySelector(`.btn-edit-test[data-qid="${q.id}"]`)?.addEventListener('click', () => openTestModal(section.id, topic.id, q.id));
//     card.querySelector(`.btn-del-test[data-qid="${q.id}"]`)?.addEventListener('click', () => {
//       if (!confirm('Удалить вопрос?')) return;
//       topic.tests = tests.filter(t => t.id !== q.id);
//       saveDB(); notify('Вопрос удалён'); render();
//     });

//     list.appendChild(card);
//   });
// }
/* ─── TESTS PANEL (ОБНОВЛЕННАЯ) ─── */
// function renderTestsPanel(section, topic, container) {
//   const panel = ce('div', { cls: 'tab-panel active' });
//   panel.innerHTML = `
//     <div class="tests-toolbar">
//       <button class="btn btn-success btn-sm" id="btnRunTests">▶ Сбросить и пройти заново</button>
//       <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
//     </div>
//     <div class="tests-list" id="testsList"></div>
//   `;
//   container.appendChild(panel);

//   $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
//   $('btnRunTests')?.addEventListener('click', () => {
//     render(); // Просто перерисовываем панель, чтобы сбросить все состояния
//     notify('Тест сброшен', 'info');
//   });
/* ─── TESTS PANEL (ОБНОВЛЕННАЯ С ИМПОРТОМ) ─── */
function renderTestsPanel(section, topic, container) {
  const panel = ce('div', { cls: 'tab-panel active' });
  panel.innerHTML = `
    <div class="tests-toolbar">
      <button class="btn btn-success btn-sm" id="btnRunTests">▶ Сбросить и пройти</button>
      <button class="btn btn-secondary btn-sm" id="btnImportTests">⬇ Импорт из ИИ</button>
      <button class="btn btn-primary btn-sm" id="btnAddTest">+ Добавить вопрос</button>
    </div>
    <div class="tests-list" id="testsList"></div>
  `;
  container.appendChild(panel);

  $('btnAddTest')?.addEventListener('click', () => openTestModal(section.id, topic.id));
  $('btnImportTests')?.addEventListener('click', () => openImportTestsModal(section.id, topic.id)); // Новая кнопка
  $('btnRunTests')?.addEventListener('click', () => {
    render(); 
    notify('Тест сброшен', 'info');
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
    
    // Поддержка и старых (число) и новых (массив) правильных ответов
    const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
    
    // Перемешиваем все доступные индексы (теперь их может быть хоть 10)
    const indices = q.options.map((_, i) => i);
    const shuffledIdx = shuffle(indices);
    const displayOptions = shuffledIdx.map(i => ({ text: q.options[i], origIdx: i }));

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="test-question">${esc(q.question)}</div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button class="ibtn btn-edit-test" data-qid="${q.id}">✏️</button>
          <button class="ibtn danger btn-del-test" data-qid="${q.id}">🗑️</button>
        </div>
      </div>
      <div class="test-options" id="opts_${q.id}"></div>
      
      <div class="test-actions" id="actions_${q.id}" style="margin-top: 12px;">
        <button class="btn btn-primary btn-sm btn-check-test" style="width:100%">Проверить ответ</button>
      </div>

      <div class="test-explanation" id="expl_${q.id}">${esc(q.explanation || '')}</div>
      
      <div class="test-footer">
        <div class="test-history">
          ${lastAttempts.map(a => `<span class="test-attempt ${a.correct?'pass':'fail'}">${a.correct?'✓':'✗'}</span>`).join('')}
        </div>
        <span class="text-muted text-sm">${history.length > 0 ? Math.round(history.filter(h=>h.correct).length/history.length*100)+'% верно' : 'Нет попыток'}</span>
      </div>
    `;

    const optsDiv = card.querySelector(`#opts_${q.id}`);
    
    // Создаем кнопки вариантов
    displayOptions.forEach((opt, dispIdx) => {
      // Генерируем буквы динамически (A, B, C, D, E, F...)
      const letter = String.fromCharCode(65 + dispIdx); 
      const btn = ce('button', { cls: 'test-option' });
      btn.dataset.origIdx = opt.origIdx; // Сохраняем реальный индекс в данные кнопки
      
      btn.innerHTML = `<span class="test-opt-letter">${letter}</span><span class="test-opt-text">${esc(opt.text)}</span>`;
      
      btn.addEventListener('click', () => {
        if (btn.classList.contains('correct') || btn.classList.contains('wrong') || btn.disabled) return;
        btn.classList.toggle('selected'); // Просто выделяем/снимаем выделение
      });
      
      optsDiv.appendChild(btn);
    });

    // Логика кнопки "Проверить"
    const checkBtn = card.querySelector('.btn-check-test');
    checkBtn.addEventListener('click', () => {
      const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
      const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.origIdx));

      if (selectedIndices.length === 0) {
        notify('Выберите хотя бы один вариант', 'warning');
        return;
      }

      // Сравниваем массивы (все ли правильные выбраны и нет ли лишних)
      const isCorrect = selectedIndices.length === correctArr.length && 
                        selectedIndices.every(idx => correctArr.includes(idx));

      // Визуализация результатов
      optsDiv.querySelectorAll('.test-option').forEach(btn => {
        btn.disabled = true;
        const idx = parseInt(btn.dataset.origIdx);
        
        if (correctArr.includes(idx)) {
          btn.classList.add('correct'); // Показываем все правильные зеленым
        }
        if (btn.classList.contains('selected') && !correctArr.includes(idx)) {
          btn.classList.add('wrong'); // Ошибочно выбранные — красным
        }
        btn.classList.remove('selected');
      });

      // Сохраняем историю
      if (!q.history) q.history = [];
      q.history.push({ date: today(), correct: isCorrect });
      saveDB();

      // Показываем объяснение и скрываем кнопку проверки
      checkBtn.parentElement.style.display = 'none';
      const expl = card.querySelector(`#expl_${q.id}`);
      if (expl && q.explanation) expl.classList.add('visible');
      
      // Обновляем футер (процент успеха) без полной перерисовки страницы
      render(); 
    });

    // Удаление и редактирование
    card.querySelector(`.btn-edit-test`)?.addEventListener('click', () => openTestModal(section.id, topic.id, q.id));
    card.querySelector(`.btn-del-test`)?.addEventListener('click', () => {
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

// function renderExamSetup(view) {
//   const counts = [10, 20, 35, 50];
//   view.innerHTML = `
//     <div class="view-header">
//       <div><div class="view-title">🎓 Экзамен</div><div class="view-subtitle">Проверьте свои знания</div></div>
//       <button class="btn btn-ghost btn-sm" id="backFromExam">← Назад</button>
//     </div>
//     <div class="exam-container">
//       <div class="exam-setup-card">
//         <div class="exam-setup-icon">🎓</div>
//         <div class="exam-setup-title">Настройка экзамена</div>
//         <div class="exam-setup-desc">Выберите раздел и количество вопросов</div>
//         <div class="mb-16" style="text-align:left">
//           <div class="form-group">
//             <label class="form-label">Раздел</label>
//             <select class="form-select" id="examSection">
//               <option value="">Все разделы</option>
//               ${DB.sections.map(s => `<option value="${s.id}" ${UI.examConfig.sectionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
//             </select>
//           </div>
//         </div>
//         <div class="exam-options-row">
//           ${counts.map(n => `<div class="exam-option-card ${UI.examConfig.count===n?'selected':''}" data-count="${n}"><div class="exam-option-n">${n}</div><div class="exam-option-label">вопросов</div></div>`).join('')}
//         </div>
//         <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:14px;padding:12px" id="btnStartExam">Начать экзамен →</button>
//       </div>
//     </div>
//   `;

//   $('backFromExam')?.addEventListener('click', () => { UI.view = UI.activeSectionId ? 'section' : 'home'; render(); });
//   $('examSection')?.addEventListener('change', e => { UI.examConfig.sectionId = e.target.value || null; });
//   $$('.exam-option-card').forEach(c => {
//     c.addEventListener('click', () => {
//       $$('.exam-option-card').forEach(x => x.classList.remove('selected'));
//       c.classList.add('selected');
//       UI.examConfig.count = parseInt(c.dataset.count);
//     });
//   });
//   $('btnStartExam')?.addEventListener('click', startExam);
// }
function renderExamSetup(view) {
  const counts = [10, 20, 35, 50];
  const selectedSection = UI.examConfig.sectionId ? findSection(UI.examConfig.sectionId) : null;

  view.innerHTML = `
    <div class="view-header">
      <div><div class="view-title">🎓 Экзамен</div><div class="view-subtitle">Проверьте свои знания</div></div>
      <button class="btn btn-ghost btn-sm" id="backFromExam">← Назад</button>
    </div>
    <div class="exam-container">
      <div class="exam-setup-card">
        <div class="exam-setup-icon">🎓</div>
        <div class="exam-setup-title">Настройка экзамена</div>
        <div class="exam-setup-desc">Выберите раздел, тему и количество вопросов</div>
        
        <div class="mb-16" style="text-align:left; display:flex; flex-direction:column; gap:12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Раздел</label>
            <select class="form-select" id="examSection">
              <option value="">Все разделы</option>
              ${DB.sections.map(s => `<option value="${s.id}" ${UI.examConfig.sectionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
            </select>
          </div>

          ${selectedSection ? `
          <div class="form-group" style="margin-bottom: 0; animation: fadeIn 0.3s ease;">
            <label class="form-label">Тема</label>
            <select class="form-select" id="examTopic">
              <option value="">Все темы раздела</option>
              ${(selectedSection.topics||[]).map(t => `<option value="${t.id}" ${UI.examConfig.topicId===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}
            </select>
          </div>
          ` : ''}
        </div>

        <div class="exam-options-row">
          ${counts.map(n => `<div class="exam-option-card ${UI.examConfig.count===n?'selected':''}" data-count="${n}"><div class="exam-option-n">${n}</div><div class="exam-option-label">вопросов</div></div>`).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:14px;padding:12px" id="btnStartExam">Начать экзамен →</button>
      </div>
    </div>
  `;

  $('backFromExam')?.addEventListener('click', () => { UI.view = UI.activeSectionId ? 'section' : 'home'; render(); });
  
  // Обработчик раздела
  $('examSection')?.addEventListener('change', e => { 
    UI.examConfig.sectionId = e.target.value || null; 
    UI.examConfig.topicId = null; // Сбрасываем выбранную тему при смене раздела
    render(); // Перерисовываем интерфейс, чтобы показать новые темы
  });

  // Обработчик темы
  $('examTopic')?.addEventListener('change', e => {
    UI.examConfig.topicId = e.target.value || null;
  });

  $$('.exam-option-card').forEach(c => {
    c.addEventListener('click', () => {
      $$('.exam-option-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      UI.examConfig.count = parseInt(c.dataset.count);
    });
  });
  
  $('btnStartExam')?.addEventListener('click', startExam);
}

// function collectExamQuestions() {
//   const sections = UI.examConfig.sectionId
//     ? DB.sections.filter(s => s.id === UI.examConfig.sectionId)
//     : DB.sections;
//   const allQ = [];
//   sections.forEach(s => {
//     (s.topics||[]).forEach(t => {
//       (t.tests||[]).forEach(q => allQ.push({ ...q, _topicTitle: t.title, _sectionTitle: s.title, _topicId: t.id, _sectionId: s.id }));
//     });
//   });
//   return shuffle(allQ).slice(0, UI.examConfig.count);
// }

// function startExam() {
//   const questions = collectExamQuestions();
//   if (!questions.length) { notify('Нет доступных вопросов в этом разделе', 'warning'); return; }
//   UI.examState = {
//     questions,
//     current: 0,
//     answers: new Array(questions.length).fill(null),
//     shuffledOpts: questions.map(q => {
//       const idx = shuffle([0,1,2,3]);
//       return { shuffledIdx: idx, newCorrect: idx.findIndex(i => i === q.correct) };
//     }),
//     revealed: new Array(questions.length).fill(false),
//     finished: false,
//     score: 0,
//   };
//   render();
// }
function collectExamQuestions() {
  const sections = UI.examConfig.sectionId
    ? DB.sections.filter(s => s.id === UI.examConfig.sectionId)
    : DB.sections;
    
  const allQ = [];
  
  sections.forEach(s => {
    // Если выбрана конкретная тема, фильтруем топики
    const topics = UI.examConfig.topicId
      ? (s.topics || []).filter(t => t.id === UI.examConfig.topicId)
      : (s.topics || []);

    topics.forEach(t => {
      (t.tests||[]).forEach(q => allQ.push({ 
        ...q, 
        _topicTitle: t.title, 
        _sectionTitle: s.title, 
        _topicId: t.id, 
        _sectionId: s.id 
      }));
    });
  });
  
  return shuffle(allQ).slice(0, UI.examConfig.count);
}

function startExam() {
  const questions = collectExamQuestions(); // Предполагаем, что эта функция у вас есть и работает
  if (!questions.length) { 
    notify('Нет доступных вопросов в этом разделе', 'warning'); 
    return; 
  }

  UI.examState = {
    questions: questions.map(q => {
      // 1. Создаем массив индексов [0, 1, 2, ... до конца options]
      const indices = q.options.map((_, i) => i);
      // 2. Перемешиваем индексы
      const shuffledIndices = shuffle(indices);
      // 3. Получаем массив правильных ответов (всегда как массив)
      const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
      
      return {
        ...q,
        // Сохраняем перемешанные тексты вариантов
        shuffledOptions: shuffledIndices.map(i => q.options[i]),
        // Сохраняем новые позиции правильных ответов
        newCorrectIndices: shuffledIndices
          .map((origIdx, newIdx) => correctArr.includes(origIdx) ? newIdx : -1)
          .filter(idx => idx !== -1)
      };
    }),
    current: 0,
    answers: [], // Будем наполнять через push
    score: 0,
  };
  render();
}
// function renderExamQuestion(view) {
//   const es = UI.examState;
//   const qi = es.current;
//   const q = es.questions[qi];
//   const total = es.questions.length;
//   const answered = es.answers[qi] !== null;
//   const { shuffledIdx, newCorrect } = es.shuffledOpts[qi];
//   const opts = shuffledIdx.map(i => q.options[i]);
//   const letters = ['A','B','C','D'];

//   view.innerHTML = `
//     <div class="view-header" style="margin-bottom:8px">
//       <div><div class="view-title">🎓 Экзамен</div></div>
//       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
//     </div>
//     <div class="exam-container">
//       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
//         <span class="exam-qnum">${q._sectionTitle} · ${q._topicTitle}</span>
//         <span class="exam-qnum">Вопрос ${qi+1} / ${total}</span>
//       </div>
//       <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${((qi+1)/total*100)}%"></div></div>
//       <div class="exam-question-card">
//         <div class="exam-question-text">${esc(q.question)}</div>
//         <div class="exam-options" id="examOpts"></div>
//         ${q.explanation && es.revealed[qi] ? `<div style="margin-top:14px;padding:12px;background:var(--accent-dim);border-radius:var(--radius-md);border-left:3px solid var(--accent);font-size:12px;color:var(--text-secondary)">${esc(q.explanation)}</div>` : ''}
//       </div>
//       <div class="exam-nav">
//         <button class="btn btn-secondary" id="btnExamPrev" ${qi===0?'disabled':''}>← Назад</button>
//         ${qi < total-1
//           ? `<button class="btn btn-primary" id="btnExamNext" ${!answered?'disabled':''}>Далее →</button>`
//           : `<button class="btn btn-success" id="btnExamFinish" ${!answered?'disabled':''}>Завершить ✓</button>`
//         }
//       </div>
//     </div>
//   `;

//   const optsDiv = $('examOpts');
//   opts.forEach((opt, dispIdx) => {
//     const btn = ce('button', { cls: 'exam-opt' });
//     let cls = '';
//     if (es.revealed[qi]) {
//       if (dispIdx === newCorrect) cls = 'correct';
//       else if (dispIdx === es.answers[qi] && dispIdx !== newCorrect) cls = 'wrong';
//       btn.disabled = true;
//     }
//     btn.className = 'exam-opt ' + cls;
//     if (!es.revealed[qi]) btn.disabled = false;
//     btn.innerHTML = `<span class="exam-opt-letter">${letters[dispIdx]}</span>${esc(opt)}`;
//     btn.addEventListener('click', () => {
//       if (es.revealed[qi]) return;
//       es.answers[qi] = dispIdx;
//       es.revealed[qi] = true;
//       if (dispIdx === newCorrect) es.score++;
//       // Save history
//       const origTopic = findTopic(q._sectionId, q._topicId);
//       const origQ = origTopic?.tests?.find(t => t.id === q.id);
//       if (origQ) {
//         if (!origQ.history) origQ.history = [];
//         origQ.history.push({ date: today(), correct: dispIdx === newCorrect });
//         saveDB();
//       }
//       render();
//     });
//     optsDiv.appendChild(btn);
//   });

//   $('btnExitExam')?.addEventListener('click', () => {
//     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
//   });
//   $('btnExamPrev')?.addEventListener('click', () => { es.current--; render(); });
//   $('btnExamNext')?.addEventListener('click', () => { es.current++; render(); });
//   $('btnExamFinish')?.addEventListener('click', () => { es.finished = true; render(); });
// }
/* ─── ОБНОВЛЕННЫЙ EXAM QUESTION ─── */
/* ─── ОБНОВЛЕННЫЙ EXAM QUESTION ─── */
function renderExamQuestion(view) {
  if (!UI.examState) return;

  const { questions, current } = UI.examState;
  const q = questions[current];

  view.innerHTML = `
    <div class="view-header" style="margin-bottom:8px">
      <div><div class="view-title">🎓 Экзамен</div></div>
      <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
    </div>
    <div class="exam-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
        <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
      </div>
      <div class="exam-progress-bar">
        <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
      </div>
      
      <div class="exam-question-card" style="margin-top: 16px;">
        <div class="exam-question-text">${esc(q.question)}</div>
        <div class="test-options" id="exam_opts"></div>
        
        <div style="margin-top: 20px;">
          <button class="btn btn-primary" id="btnNextExam" style="width: 100%">Подтвердить ответ</button>
        </div>
      </div>
    </div>
  `;

  $('btnExitExam')?.addEventListener('click', () => {
    if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
  });

  const optsDiv = $('exam_opts');
  
  // Отрисовываем заранее перемешанные варианты
  q.shuffledOptions.forEach((optText, i) => {
    const btn = ce('button', { cls: 'test-option' });
    // Сохраняем индекс варианта прямо в кнопке
    btn.dataset.idx = i;
    
    btn.innerHTML = `
      <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
      <span class="test-opt-text">${esc(optText)}</span>
    `;
    
    btn.onclick = () => {
      btn.classList.toggle('selected');
    };
    optsDiv.appendChild(btn);
  });

  $('btnNextExam').onclick = () => {
    // Собираем индексы всех выбранных кнопок
    const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
    const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

    if (selectedIndices.length === 0) {
      notify('Выберите хотя бы один вариант', 'warning');
      return;
    }

    handleExamAnswer(selectedIndices);
  };
}
function handleExamAnswer(userIndices) {
  const { questions, current } = UI.examState;
  const q = questions[current];
  
  // Правильные индексы в текущем (перемешанном) вопросе
  const correctArr = q.newCorrectIndices;

  // Проверка: количество совпадает И каждый выбранный индекс есть в списке правильных
  const isCorrect = userIndices.length === correctArr.length && 
                    userIndices.every(idx => correctArr.includes(idx));

  UI.examState.answers.push(isCorrect);
  if (isCorrect) UI.examState.score++;

  // Сохраняем историю ответов в базу для статистики (Средний балл)
  const origTopic = findTopic(q._sectionId, q._topicId);
  if (origTopic) {
    const origQ = origTopic.tests?.find(t => t.id === q.id);
    if (origQ) {
      if (!origQ.history) origQ.history = [];
      origQ.history.push({ date: today(), correct: isCorrect });
      saveDB();
    }
  }

  UI.examState.current++;

  // Если вопросы закончились, ставим флаг завершения
  if (UI.examState.current >= questions.length) {
    UI.examState.finished = true;
  }
  
  // Вызываем глобальный render() — он сам решит показать следующий вопрос или итоги
  render(); 
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
/* ─── FLASHCARD VIEW (ANKI) ─── */

function renderFlashcardView() {
  let view = $('viewRep');
  if (!view) { view = ce('div', { id: 'viewRep', cls: 'view' }); $('content').appendChild(view); }
  view.classList.add('active');
  if (!UI.fcMode) UI.fcMode = 'setup';
  if (UI.fcMode === 'setup') renderFCSetup(view);
  else if (UI.fcMode === 'study') renderFCStudy(view);
  else if (UI.fcMode === 'done') renderFCDone(view);
}

function getAllFCTags() {
  if (!DB.flashcards) DB.flashcards = [];
  const sections = new Set();
  const subsections = new Set();
  DB.flashcards.forEach(c => {
    if (c.sectionTag) sections.add(c.sectionTag);
    if (c.subsectionTag) subsections.add(c.subsectionTag);
  });
  return { sections: [...sections].sort(), subsections: [...subsections].sort() };
}

function getCardsDue(filterSection, filterSubsection) {
  if (!DB.flashcards) DB.flashcards = [];
  const now = Date.now();
  return DB.flashcards.filter(c => {
    if (filterSection && c.sectionTag !== filterSection) return false;
    if (filterSubsection && c.subsectionTag !== filterSubsection) return false;
    return !c.due || c.due <= now;
  });
}

function getAllCardsFiltered(filterSection, filterSubsection) {
  if (!DB.flashcards) DB.flashcards = [];
  return DB.flashcards.filter(c => {
    if (filterSection && c.sectionTag !== filterSection) return false;
    if (filterSubsection && c.subsectionTag !== filterSubsection) return false;
    return true;
  });
}

function smRate(card, rating) {
  let ef = card.ef || 2.5;
  let interval = card.interval || 0;
  let reps = card.reps || 0;
  if (rating < 2) {
    interval = 0;
    reps = 0;
  } else {
    reps++;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ef);
    ef = Math.max(1.3, ef + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02)));
  }
  card.ef = ef;
  card.interval = interval;
  card.reps = reps;
  card.due = Date.now() + interval * 86400000;
  card.lastReviewed = Date.now();
}

function parseCSV(text) {
  const lines = text.split('\n');
  const cards = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const commaIdx = line.indexOf(',');
    if (commaIdx < 0) continue;
    const q = line.slice(0, commaIdx).trim();
    const a = line.slice(commaIdx + 1).trim();
    if (q && a) cards.push({ q, a });
  }
  return cards;
}

function renderFCSetup(view) {
  if (!DB.flashcards) DB.flashcards = [];
  const tags = getAllFCTags();
  const filterSec = UI.fcFilterSection || '';
  const filterSub = UI.fcFilterSubsection || '';
  const due = getCardsDue(filterSec, filterSub).length;
  const total = getAllCardsFiltered(filterSec, filterSub).length;

  let sectionOptions = '<option value="">— Все разделы —</option>' + tags.sections.map(s => `<option value="${esc(s)}" ${filterSec===s?'selected':''}>${esc(s)}</option>`).join('');
  let subsectionOptions = '<option value="">— Все подразделы —</option>' + tags.subsections.map(s => `<option value="${esc(s)}" ${filterSub===s?'selected':''}>${esc(s)}</option>`).join('');

  view.innerHTML = `
<div class="view-header">
  <div>
    <div class="view-title">🗂 Карточки (Anki)</div>
    <div class="view-subtitle">Интервальное повторение · ${due} к повторению · ${total} всего</div>
  </div>
</div>
<div style="max-width:640px;margin:0 auto;padding:0 8px">
  <div class="card" style="margin-bottom:18px">
    <div class="card-header" style="font-weight:600;margin-bottom:12px">📥 Импорт CSV</div>
    <div style="font-size:0.82em;color:var(--text-secondary);margin-bottom:8px">Формат: <code>вопрос,ответ</code> — одна карточка на строку</div>
    <textarea id="fcCsvText" placeholder="Вставьте CSV или выберите файл ниже..." style="width:100%;height:90px;resize:vertical;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:8px;font-family:monospace;font-size:0.82em;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">
      <input type="file" id="fcCsvFile" accept=".csv,.txt" style="display:none">
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('fcCsvFile').click()">📂 Файл</button>
      <input id="fcImportSection" type="text" placeholder="Раздел (тег)" style="flex:1;min-width:110px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:0.85em">
      <input id="fcImportSubsection" type="text" placeholder="Подраздел (тег)" style="flex:1;min-width:110px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:0.85em">
      <button class="btn btn-primary btn-sm" id="btnFCImport">Импортировать</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:18px">
    <div class="card-header" style="font-weight:600;margin-bottom:12px">🔍 Фильтр</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <select id="fcSelSection" style="flex:1;min-width:130px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:0.85em">${sectionOptions}</select>
      <select id="fcSelSubsection" style="flex:1;min-width:130px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:0.85em">${subsectionOptions}</select>
    </div>
  </div>

  ${total === 0 ? `<div class="empty-state"><div class="empty-icon">🃏</div><div class="empty-title">Нет карточек</div><div class="empty-desc">Импортируйте CSV чтобы начать</div></div>` : `
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn btn-primary" id="btnFCStartDue" style="flex:1" ${due===0?'disabled':''}>
      ▶ Повторять (${due} шт.)
    </button>
    <button class="btn btn-secondary" id="btnFCStartAll" style="flex:1">
      🔀 Все карточки (${total} шт.)
    </button>
  </div>
  `}

  ${DB.flashcards.length > 0 ? `
  <div style="margin-top:18px">
    <div style="font-weight:600;margin-bottom:10px;font-size:0.9em;color:var(--text-secondary)">📚 Разделы</div>
    ${tags.sections.map(sec => {
      const cnt = DB.flashcards.filter(c => c.sectionTag === sec).length;
      const dueCnt = getCardsDue(sec, '').length;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:0.9em">${esc(sec)}</span>
        <span style="font-size:0.8em;color:var(--text-secondary)">${dueCnt > 0 ? `<span style="color:#f59e0b;font-weight:600">${dueCnt} к повторению</span> · ` : ''}${cnt} карточек</span>
      </div>`;
    }).join('')}
  </div>
  ` : ''}
</div>`;

  document.getElementById('fcCsvFile')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { document.getElementById('fcCsvText').value = ev.target.result; };
    reader.readAsText(file, 'UTF-8');
  });

  document.getElementById('fcSelSection')?.addEventListener('change', e => {
    UI.fcFilterSection = e.target.value;
    renderFlashcardView();
  });

  document.getElementById('fcSelSubsection')?.addEventListener('change', e => {
    UI.fcFilterSubsection = e.target.value;
    renderFlashcardView();
  });

  document.getElementById('btnFCImport')?.addEventListener('click', () => {
    const csvText = document.getElementById('fcCsvText').value.trim();
    if (!csvText) { notify('Вставьте CSV текст', 'error'); return; }
    const secTag = document.getElementById('fcImportSection').value.trim();
    const subTag = document.getElementById('fcImportSubsection').value.trim();
    const parsed = parseCSV(csvText);
    if (!parsed.length) { notify('Не удалось распарсить CSV', 'error'); return; }
    if (!DB.flashcards) DB.flashcards = [];
    let added = 0;
    parsed.forEach(({ q, a }) => {
      DB.flashcards.push({ id: uid(), question: q, answer: a, sectionTag: secTag, subsectionTag: subTag, due: 0, interval: 0, ef: 2.5, reps: 0 });
      added++;
    });
    saveDB();
    notify(`Импортировано ${added} карточек`, 'success');
    document.getElementById('fcCsvText').value = '';
    renderFlashcardView();
  });

  document.getElementById('btnFCStartDue')?.addEventListener('click', () => {
    const queue = shuffle(getCardsDue(UI.fcFilterSection||'', UI.fcFilterSubsection||''));
    if (!queue.length) { notify('Нет карточек для повторения', 'info'); return; }
    UI.fcQueue = queue.map(c => c.id);
    UI.fcQueueIdx = 0;
    UI.fcFlipped = false;
    UI.fcMode = 'study';
    UI.fcStudyAll = false;
    renderFlashcardView();
  });

  document.getElementById('btnFCStartAll')?.addEventListener('click', () => {
    const queue = shuffle(getAllCardsFiltered(UI.fcFilterSection||'', UI.fcFilterSubsection||''));
    if (!queue.length) { notify('Нет карточек', 'info'); return; }
    UI.fcQueue = queue.map(c => c.id);
    UI.fcQueueIdx = 0;
    UI.fcFlipped = false;
    UI.fcMode = 'study';
    UI.fcStudyAll = true;
    renderFlashcardView();
  });
}

function renderFCStudy(view) {
  if (!DB.flashcards) DB.flashcards = [];
  const queue = UI.fcQueue || [];
  const idx = UI.fcQueueIdx || 0;
  if (idx >= queue.length) {
    UI.fcMode = 'done';
    renderFlashcardView();
    return;
  }
  const cardId = queue[idx];
  const card = DB.flashcards.find(c => c.id === cardId);
  if (!card) { UI.fcQueueIdx = (UI.fcQueueIdx || 0) + 1; renderFlashcardView(); return; }
  const flipped = !!UI.fcFlipped;
  const progress = `${idx + 1} / ${queue.length}`;
  const pct = Math.round((idx / queue.length) * 100);

  view.innerHTML = `
<div class="view-header">
  <div style="display:flex;align-items:center;gap:12px;width:100%">
    <button class="btn btn-secondary btn-sm" id="btnFCBack">← Назад</button>
    <div style="flex:1">
      <div class="view-title">🗂 Карточки</div>
      <div class="view-subtitle">${progress}${card.sectionTag ? ' · ' + esc(card.sectionTag) : ''}${card.subsectionTag ? ' / ' + esc(card.subsectionTag) : ''}</div>
    </div>
  </div>
</div>
<div style="max-width:600px;margin:0 auto;padding:0 8px">
  <div style="background:var(--bg-secondary);border-radius:4px;height:6px;margin-bottom:20px;overflow:hidden">
    <div style="height:100%;width:${pct}%;background:var(--accent);transition:width 0.3s"></div>
  </div>

  <div id="fcCard" style="min-height:220px;background:var(--bg-secondary);border:2px solid var(--border);border-radius:12px;padding:28px 24px;cursor:pointer;transition:box-shadow 0.2s;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
    ${!flipped ? `
    <div style="font-size:0.75em;color:var(--text-secondary);margin-bottom:12px;letter-spacing:0.05em;text-transform:uppercase">Вопрос</div>
    <div style="font-size:1.05em;line-height:1.6">${renderMd(card.question)}</div>
    <div style="margin-top:20px;font-size:0.8em;color:var(--text-secondary);opacity:0.7">Нажмите чтобы увидеть ответ</div>
    ` : `
    <div style="font-size:0.75em;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.05em;text-transform:uppercase">Вопрос</div>
    <div style="font-size:0.9em;line-height:1.5;color:var(--text-secondary);margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">${renderMd(card.question)}</div>
    <div style="font-size:0.75em;color:#34d399;margin-bottom:10px;letter-spacing:0.05em;text-transform:uppercase">Ответ</div>
    <div style="font-size:1.05em;line-height:1.6;color:var(--text-primary)">${renderMd(card.answer)}</div>
    `}
  </div>

  ${flipped ? `
  <div style="margin-top:18px">
    <div style="font-size:0.8em;color:var(--text-secondary);text-align:center;margin-bottom:10px">Как хорошо вы знали ответ?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
      <button class="btn btn-sm fc-rate" data-r="0" style="background:#ef4444;border-color:#ef4444;color:#fff;font-size:0.8em;padding:10px 4px">😵<br>Снова</button>
      <button class="btn btn-sm fc-rate" data-r="1" style="background:#f97316;border-color:#f97316;color:#fff;font-size:0.8em;padding:10px 4px">😓<br>Сложно</button>
      <button class="btn btn-sm fc-rate" data-r="2" style="background:#22c55e;border-color:#22c55e;color:#fff;font-size:0.8em;padding:10px 4px">🙂<br>Хорошо</button>
      <button class="btn btn-sm fc-rate" data-r="3" style="background:#3b82f6;border-color:#3b82f6;color:#fff;font-size:0.8em;padding:10px 4px">😎<br>Легко</button>
    </div>
  </div>
  ` : `
  <div style="margin-top:14px;text-align:center">
    <button class="btn btn-primary" id="btnFCFlip">Показать ответ 🔄</button>
  </div>
  `}
</div>`;

  document.getElementById('fcCard')?.addEventListener('click', () => {
    if (!UI.fcFlipped) { UI.fcFlipped = true; renderFlashcardView(); }
  });

  document.getElementById('btnFCFlip')?.addEventListener('click', () => {
    UI.fcFlipped = true; renderFlashcardView();
  });

  document.getElementById('btnFCBack')?.addEventListener('click', () => {
    UI.fcMode = 'setup'; UI.fcQueue = null; UI.fcQueueIdx = 0; UI.fcFlipped = false;
    renderFlashcardView();
  });

  view.querySelectorAll('.fc-rate').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.r);
      smRate(card, rating);
      saveDB();
      UI.fcQueueIdx = (UI.fcQueueIdx || 0) + 1;
      UI.fcFlipped = false;
      if (rating < 2 && !UI.fcStudyAll) {
        UI.fcQueue.push(cardId);
      }
      renderFlashcardView();
    });
  });
}

function renderFCDone(view) {
  view.innerHTML = `
<div class="view-header">
  <div class="view-title">🗂 Карточки</div>
</div>
<div style="max-width:500px;margin:60px auto;text-align:center;padding:0 16px">
  <div style="font-size:3em;margin-bottom:16px">🎉</div>
  <div style="font-size:1.3em;font-weight:bold;margin-bottom:8px">Сессия завершена!</div>
  <div style="color:var(--text-secondary);margin-bottom:28px">Вы прошли все карточки в этой сессии</div>
  <button class="btn btn-primary" id="btnFCRestart">← Вернуться к выбору</button>
</div>`;
  document.getElementById('btnFCRestart')?.addEventListener('click', () => {
    UI.fcMode = 'setup'; UI.fcQueue = null; UI.fcQueueIdx = 0; UI.fcFlipped = false;
    renderFlashcardView();
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

// /* ─── TOPIC MODAL ─── */
// function openTopicModal(topicId = null) {
//   const section = findSection(UI.activeSectionId);
//   if (!section) return;
//   const topic = topicId ? findTopic(UI.activeSectionId, topicId) : null;

//   let tagsArr = [...(topic?.tags || [])];
//   let difficulty = topic?.difficulty || 1;

//   const modal = buildModal('topicModal', topic ? 'Редактировать тему' : 'Новая тема', `
//     <div class="form-group">
//       <label class="form-label">Название *</label>
//       <input class="form-input" id="tm_title" value="${esc(topic?.title||'')}" placeholder="Название темы">
//     </div>
//     <div class="form-row">
//       <div class="form-group">
//         <label class="form-label">Статус</label>
//         <select class="form-select" id="tm_status">
//           <option value="learning" ${topic?.status==='learning'?'selected':''}>📘 Изучаю</option>
//           <option value="review" ${topic?.status==='review'?'selected':''}>🔄 Повторить</option>
//           <option value="done" ${topic?.status==='done'?'selected':''}>✅ Освоено</option>
//         </select>
//       </div>
//       <div class="form-group">
//         <label class="form-label">Приоритет</label>
//         <select class="form-select" id="tm_priority">
//           <option value="low" ${topic?.priority==='low'?'selected':''}>↓ Низкий</option>
//           <option value="medium" ${topic?.priority==='medium'||!topic?.priority?'selected':''}>→ Средний</option>
//           <option value="high" ${topic?.priority==='high'?'selected':''}>↑ Высокий</option>
//         </select>
//       </div>
//     </div>
//     <div class="form-row">
//       <div class="form-group">
//         <label class="form-label">Дата повторения</label>
//         <input type="date" class="form-input" id="tm_lastReview" value="${topic?.lastReview||''}">
//       </div>
//       <div class="form-group">
//         <label class="form-label">Дедлайн</label>
//         <input type="date" class="form-input" id="tm_deadline" value="${topic?.deadline||''}">
//       </div>
//     </div>
//     <div class="form-group">
//       <label class="form-label">Сложность</label>
//       <div class="difficulty-stars" id="starsWrap">
//         ${[1,2,3,4,5].map(i=>`<button type="button" class="star-btn ${i<=difficulty?'on':'off'}" data-star="${i}">★</button>`).join('')}
//       </div>
//     </div>
//     <div class="form-group">
//       <label class="form-label">Теги</label>
//       <div class="form-input tags-container" id="tagsContainer" style="min-height:40px;cursor:text">
//         ${tagsArr.map(t=>`<span class="badge badge-tag">#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button></span>`).join('')}
//         <input type="text" class="tags-input-field" id="tagsInput" placeholder="Добавить тег…">
//       </div>
//       <div class="form-hint">Нажмите Enter или запятую для добавления тега</div>
//     </div>
//     <div class="form-group">
//       <label class="form-check">
//         <input type="checkbox" id="tm_difficult" ${topic?.isDifficult?'checked':''}>
//         <span class="form-check-label">⚠ Пометить как сложную тему</span>
//       </label>
//     </div>
//   `, () => {
//     const title = $('tm_title').value.trim();
//     if (!title) { notify('Введите название темы', 'error'); return; }
//     const data = {
//       title,
//       status: $('tm_status').value,
//       priority: $('tm_priority').value,
//       lastReview: $('tm_lastReview').value || null,
//       deadline: $('tm_deadline').value || null,
//       difficulty,
//       tags: tagsArr,
//       isDifficult: $('tm_difficult').checked,
//     };
//     if (topic) {
//       Object.assign(topic, data);
//     } else {
//       if (!section.topics) section.topics = [];
//       section.topics.push({ id: uid(), ...data, notes: '', links: [], tests: [], testHistory: [] });
//     }
//     saveDB(); closeAllModals(); notify(topic ? 'Тема обновлена' : 'Тема создана', 'success'); render();
//   });

//   document.body.appendChild(modal);
//   openModal('topicModal');
//   $('tm_title')?.focus();

//   // Stars
//   const starsWrap = $('starsWrap');
//   starsWrap?.querySelectorAll('.star-btn').forEach(btn => {
//     btn.addEventListener('click', () => {
//       difficulty = parseInt(btn.dataset.star);
//       starsWrap.querySelectorAll('.star-btn').forEach((b,i) => {
//         b.className = `star-btn ${i < difficulty ? 'on' : 'off'}`;
//       });
//     });
//   });

//   // Tags
//   const tagsContainer = $('tagsContainer');
//   const tagsInput = $('tagsInput');

//   function refreshTags() {
//     tagsContainer.querySelectorAll('.badge').forEach(b => b.remove());
//     tagsArr.forEach(t => {
//       const badge = ce('span', { cls: 'badge badge-tag' });
//       badge.innerHTML = `#${esc(t)}<button type="button" class="tag-remove" data-tag="${esc(t)}">×</button>`;
//       badge.querySelector('.tag-remove').addEventListener('click', () => {
//         tagsArr = tagsArr.filter(x => x !== t);
//         refreshTags();
//       });
//       tagsContainer.insertBefore(badge, tagsInput);
//     });
//   }

//   tagsContainer?.addEventListener('click', () => tagsInput?.focus());
//   tagsInput?.addEventListener('keydown', e => {
//     if (e.key === 'Enter' || e.key === ',') {
//       e.preventDefault();
//       const val = tagsInput.value.trim().replace(/,/g,'');
//       if (val && !tagsArr.includes(val)) { tagsArr.push(val); refreshTags(); }
//       tagsInput.value = '';
//     } else if (e.key === 'Backspace' && !tagsInput.value && tagsArr.length) {
//       tagsArr.pop(); refreshTags();
//     }
//   });

//   // Remove existing tag badges and re-render
//   tagsContainer?.querySelectorAll('.badge').forEach(b => b.remove());
//   refreshTags();
// }
/* ─── TOPIC MODAL ─── */
function openTopicModal(topicId = null) {
  const section = findSection(UI.activeSectionId);
  if (!section) return;
  const topic = topicId ? findTopic(UI.activeSectionId, topicId) : null;

  // --- РАСЧЕТ ДАТ ПО УМОЛЧАНИЮ ---
  const now = new Date();
  
  // Завтра
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Через 5 месяцев
  const future = new Date(now);
  future.setMonth(now.getMonth() + 5);
  const deadlineStr = future.toISOString().split('T')[0];
  // ------------------------------

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
        <input type="date" class="form-input" id="tm_lastReview" value="${topic?.lastReview || tomorrowStr}">
      </div>
      <div class="form-group">
        <label class="form-label">Дедлайн</label>
        <input type="date" class="form-input" id="tm_deadline" value="${topic?.deadline || deadlineStr}">
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
// function openTestModal(sectionId, topicId, testId = null) {
//   const topic = findTopic(sectionId, topicId);
//   if (!topic) return;
//   const test = testId ? topic.tests?.find(t => t.id === testId) : null;

//   const modal = buildModal('testModal', test ? 'Редактировать вопрос' : 'Новый вопрос', `
//     <div class="form-group">
//       <label class="form-label">Вопрос *</label>
//       <textarea class="form-textarea" id="qm_question" rows="2" placeholder="Текст вопроса">${esc(test?.question||'')}</textarea>
//     </div>
//     ${[0,1,2,3].map(i => `
//       <div class="form-group">
//         <label class="form-label">Вариант ${String.fromCharCode(65+i)} ${i===0?'*':''}</label>
//         <input class="form-input" id="qm_opt${i}" value="${esc(test?.options?.[i]||'')}" placeholder="Вариант ответа ${String.fromCharCode(65+i)}">
//       </div>
//     `).join('')}
//     <div class="form-group">
//       <label class="form-label">Правильный ответ *</label>
//       <select class="form-select" id="qm_correct">
//         ${[0,1,2,3].map(i=>`<option value="${i}" ${test?.correct===i?'selected':''}>Вариант ${String.fromCharCode(65+i)}</option>`).join('')}
//       </select>
//     </div>
//     <div class="form-group">
//       <label class="form-label">Объяснение (показывается после ответа)</label>
//       <textarea class="form-textarea" id="qm_expl" rows="2" placeholder="Почему этот ответ правильный...">${esc(test?.explanation||'')}</textarea>
//     </div>
//   `, () => {
//     const question = $('qm_question').value.trim();
//     const opts = [0,1,2,3].map(i => $('qm_opt'+i).value.trim());
//     if (!question) { notify('Введите вопрос', 'error'); return; }
//     if (opts.some(o => !o)) { notify('Заполните все варианты ответа', 'error'); return; }
//     const correct = parseInt($('qm_correct').value);
//     const explanation = $('qm_expl').value.trim();
//     if (!topic.tests) topic.tests = [];
//     if (test) {
//       test.question = question; test.options = opts; test.correct = correct; test.explanation = explanation;
//     } else {
//       topic.tests.push({ id: uid(), question, options: opts, correct, explanation, history: [] });
//     }
//     saveDB(); closeAllModals(); notify(test ? 'Вопрос обновлён' : 'Вопрос добавлен', 'success'); render();
//   });

//   document.body.appendChild(modal);
//   openModal('testModal');
//   $('qm_question')?.focus();
// }

/* ─── ОБНОВЛЕННЫЙ TEST MODAL ─── */
/* ─── ОБНОВЛЕННЫЙ TEST MODAL (С НОВЫМ ДИЗАЙНОМ) ─── */
function openTestModal(sectionId, topicId, testId = null) {
  const topic = findTopic(sectionId, topicId);
  if (!topic) return;
  const test = testId ? topic.tests?.find(t => t.id === testId) : null;

  // Новый компактный дизайн для строки варианта ответа
  const renderOptionRow = (val = '', isCorrect = false) => `
    <div class="option-row modern-option-row">
      <label class="modern-option-checkbox" title="Отметить как правильный">
        <input type="checkbox" class="qm_correct_check" ${isCorrect ? 'checked' : ''}>
        <span class="custom-checkbox"></span>
      </label>
      <div class="modern-option-input-wrapper">
        <input class="qm_opt" value="${esc(val)}" placeholder="Введите вариант ответа...">
      </div>
      <button type="button" class="modern-option-delete" onclick="this.parentElement.remove()" title="Удалить вариант">✕</button>
    </div>
  `;

  const initialOptions = test?.options || ['', '', '', ''];
  const correctArr = Array.isArray(test?.correct) ? test.correct : (test?.correct !== undefined ? [test.correct] : []);

  const modal = buildModal('testModal', test ? 'Редактировать вопрос' : 'Новый вопрос', `
    <div class="form-group">
      <label class="form-label">Вопрос *</label>
      <textarea class="form-textarea" id="qm_question" rows="2" placeholder="Текст вопроса">${esc(test?.question || '')}</textarea>
    </div>
    
    <label class="form-label" style="margin-top: 12px; display: block;">Варианты ответов (отметьте правильные галочкой) *</label>
    <div id="options_container">
      ${initialOptions.map((opt, i) => renderOptionRow(opt, correctArr.includes(i))).join('')}
    </div>
    
    <button type="button" id="add_option_btn" class="btn btn-secondary btn-sm" style="margin-top: 4px;">+ Добавить вариант</button>

    <div class="form-group" style="margin-top: 20px;">
      <label class="form-label">Объяснение (показывается после ответа)</label>
      <textarea class="form-textarea" id="qm_expl" rows="2" placeholder="Почему эти ответы правильные...">${esc(test?.explanation || '')}</textarea>
    </div>
  `, () => {
    // ЛОГИКА СОХРАНЕНИЯ
    const question = $('qm_question').value.trim();
    const rows = document.querySelectorAll('.option-row');
    
    const opts = [];
    const correct = [];

    rows.forEach((row) => {
      const text = row.querySelector('.qm_opt').value.trim();
      const isCorrect = row.querySelector('.qm_correct_check').checked;
      if (text) {
        opts.push(text);
        if (isCorrect) correct.push(opts.length - 1);
      }
    });

    if (!question) { notify('Введите вопрос', 'error'); return; }
    if (opts.length < 2) { notify('Нужно минимум 2 варианта ответа', 'error'); return; }
    if (correct.length === 0) { notify('Выберите хотя бы один правильный ответ', 'error'); return; }

    if (!topic.tests) topic.tests = [];
    
    const testData = {
      id: test ? test.id : uid(),
      question,
      options: opts,
      correct: correct,
      explanation: $('qm_expl').value.trim(),
      history: test ? (test.history || []) : []
    };

    if (test) {
      Object.assign(test, testData);
    } else {
      topic.tests.push(testData);
    }

    saveDB(); closeAllModals(); notify(test ? 'Вопрос обновлён' : 'Вопрос добавлен', 'success'); render();
  });

  document.body.appendChild(modal);
  
  $('add_option_btn').onclick = () => {
    const container = $('options_container');
    const div = document.createElement('div');
    div.innerHTML = renderOptionRow();
    container.appendChild(div.firstElementChild);
  };

  openModal('testModal');
  $('qm_question')?.focus();
}
/* ─── IMPORT TESTS MODAL (ДЛЯ НЕЙРОСЕТЕЙ) ─── */
function openImportTestsModal(sectionId, topicId) {
  const topic = findTopic(sectionId, topicId);
  if (!topic) return;

  const modal = buildModal('importTestsModal', 'Импорт вопросов (JSON)', `
    <div class="form-group">
      <label class="form-label">Вставьте JSON от нейросети *</label>
      <textarea class="form-textarea" id="im_tests_json" rows="12" style="font-family: monospace; font-size: 13px; white-space: pre;" placeholder='[
  {
    "question": "Текст вопроса?",
    "options": ["Вариант А", "Вариант Б", "Вариант В"],
    "correct": [0],
    "explanation": "Объяснение ответа"
  }
]'></textarea>
    </div>
    <div class="form-hint" style="margin-top: 8px;">
      Скопируйте специальный промпт для нейросети, чтобы она выдала правильный формат.
    </div>
  `, () => {
    const val = $('im_tests_json').value.trim();
    if (!val) { notify('Вставьте код', 'error'); return; }
    
    try {
      // Пытаемся прочитать JSON
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error('Код должен начинаться с [ и заканчиваться ] (массив)');

      let added = 0;
      if (!topic.tests) topic.tests = [];

      // Проходим по каждому вопросу от ИИ
      parsed.forEach(item => {
        // Базовая валидация: есть вопрос, есть варианты, есть правильные ответы
        if (item.question && Array.isArray(item.options) && Array.isArray(item.correct)) {
          topic.tests.push({
            id: uid(), // Генерируем уникальный ID для каждого
            question: item.question,
            options: item.options,
            correct: item.correct, // Массив индексов (например [0, 2])
            explanation: item.explanation || '',
            history: []
          });
          added++;
        }
      });

      if (added > 0) {
        saveDB(); 
        closeAllModals(); 
        notify(`Успешно добавлено вопросов: ${added}`, 'success'); 
        render();
      } else {
        notify('Формат верный, но вопросы не найдены. Проверьте структуру.', 'warning');
      }
    } catch (e) {
      notify('Ошибка чтения JSON: проверьте, нет ли лишних символов.', 'error');
      console.error(e);
    }
  });

  document.body.appendChild(modal);
  openModal('importTestsModal');
}


/* ─── ОБНОВЛЕННЫЙ EXAM QUESTION (С ОБРАТНОЙ СВЯЗЬЮ) ─── */
// function renderExamQuestion(view) {
//   if (!UI.examState) return;

//   const { questions, current, currentAnswerRevealed, lastSelectedIndices } = UI.examState;
//   const q = questions[current];
//   const isLastQuestion = current === questions.length - 1;

//   view.innerHTML = `
//     <div class="view-header" style="margin-bottom:8px">
//       <div><div class="view-title">🎓 Экзамен</div></div>
//       <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
//     </div>
//     <div class="exam-container">
//       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
//         <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
//         <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
//       </div>
//       <div class="exam-progress-bar">
//         <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
//       </div>
      
//       <div class="exam-question-card" style="margin-top: 16px;">
//         <div class="exam-question-text">${esc(q.question)}</div>
//         <div class="test-options" id="exam_opts"></div>
        
//         <div class="test-explanation" id="exam_expl" style="margin-top: 16px; ${currentAnswerRevealed && q.explanation ? 'display:block; opacity:1; visibility:visible; padding:12px; background:var(--accent-dim); border-left:3px solid var(--accent); border-radius:var(--radius-md); font-size:13px;' : 'display:none;'}">
//           <strong>Объяснение:</strong><br>
//           ${esc(q.explanation || '')}
//         </div>
        
//         <div style="margin-top: 20px;">
//           ${!currentAnswerRevealed 
//             ? `<button class="btn btn-primary" id="btnCheckExam" style="width: 100%">Подтвердить ответ</button>`
//             : `<button class="btn btn-primary" id="btnNextExam" style="width: 100%">${isLastQuestion ? 'Завершить экзамен ✓' : 'Следующий вопрос →'}</button>`
//           }
//         </div>
//       </div>
//     </div>
//   `;

//   $('btnExitExam')?.addEventListener('click', () => {
//     if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
//   });

//   const optsDiv = $('exam_opts');
  
//   q.shuffledOptions.forEach((optText, i) => {
//     const btn = ce('button', { cls: 'test-option' });
//     btn.dataset.idx = i;
    
//     btn.innerHTML = `
//       <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
//       <span class="test-opt-text">${esc(optText)}</span>
//     `;
    
//     if (currentAnswerRevealed) {
//       // Режим просмотра результата ответа
//       btn.disabled = true;
//       const isCorrectAns = q.newCorrectIndices.includes(i);
//       const isSelected = lastSelectedIndices.includes(i);
      
//       if (isCorrectAns) {
//         btn.classList.add('correct'); // Зеленый для всех правильных
//       }
//       if (isSelected && !isCorrectAns) {
//         btn.classList.add('wrong');   // Красный для ошибочно выбранных
//       }
//     } else {
//       // Режим выбора ответа
//       btn.onclick = () => btn.classList.toggle('selected');
//     }
    
//     optsDiv.appendChild(btn);
//   });

//   // Логика кнопок
//   if (!currentAnswerRevealed) {
//     $('btnCheckExam').onclick = () => {
//       const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
//       const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

//       if (selectedIndices.length === 0) {
//         notify('Выберите хотя бы один вариант', 'warning');
//         return;
//       }
//       handleExamAnswer(selectedIndices);
//     };
//   } else {
//     $('btnNextExam').onclick = () => {
//       UI.examState.current++;
//       UI.examState.currentAnswerRevealed = false; // Сбрасываем флаг для следующего вопроса
//       UI.examState.lastSelectedIndices = [];
      
//       if (UI.examState.current >= questions.length) {
//         UI.examState.finished = true;
//       }
//       render();
//     };
//   }
// }

/* ─── ОБНОВЛЕННЫЙ EXAM QUESTION (С УМНОЙ ОБРАТНОЙ СВЯЗЬЮ) ─── */
function renderExamQuestion(view) {
  if (!UI.examState) return;

  const { questions, current, currentAnswerRevealed, lastSelectedIndices } = UI.examState;
  const q = questions[current];
  const isLastQuestion = current === questions.length - 1;

  // Переменные для текста и цвета обратной связи
  let feedbackMsg = '';
  let feedbackColor = '';
  let isPerfectMatch = false;
  let hasIncorrect = false;
  let hasMissed = false;

  // Анализируем ответ, если он уже дан
  if (currentAnswerRevealed) {
    const correctArr = q.newCorrectIndices;
    const selectedArr = lastSelectedIndices || [];

    // 1. Выбраны ВСЕ правильные и НИ ОДНОГО неправильного
    isPerfectMatch = selectedArr.length === correctArr.length && selectedArr.every(i => correctArr.includes(i));
    // 2. Выбран хотя бы один НЕПРАВИЛЬНЫЙ вариант
    hasIncorrect = selectedArr.some(i => !correctArr.includes(i));
    // 3. Выбраны только правильные, но НЕ ВСЕ
    hasMissed = correctArr.some(i => !selectedArr.includes(i)) && !hasIncorrect;

    if (isPerfectMatch) {
      feedbackMsg = '✅ Абсолютно верно!';
      feedbackColor = '#10b981'; // Зеленый
    } else if (hasIncorrect) {
      feedbackMsg = '❌ Некоторые варианты выбраны неверно.';
      feedbackColor = '#ef4444'; // Красный
    } else if (hasMissed) {
      feedbackMsg = '⚠️ Выбраны не все правильные варианты.';
      feedbackColor = '#f59e0b'; // Оранжевый
    }
  }

  view.innerHTML = `
    <style>
      /* Добавляем стили для оранжевого "неполного" ответа */
      .test-option.warning {
        border-color: #f59e0b !important;
        background: rgba(245, 158, 11, 0.1) !important;
      }
      .test-option.warning .test-opt-letter {
        background: #f59e0b !important;
        color: #fff !important;
        border-color: #f59e0b !important;
      }
    </style>
    
    <div class="view-header" style="margin-bottom:8px">
      <div><div class="view-title">🎓 Экзамен</div></div>
      <button class="btn btn-ghost btn-sm" id="btnExitExam">✕ Завершить</button>
    </div>
    
    <div class="exam-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="exam-qnum">${esc(q._sectionTitle)} · ${esc(q._topicTitle)}</span>
        <span class="exam-qnum">Вопрос ${current + 1} / ${questions.length}</span>
      </div>
      <div class="exam-progress-bar">
        <div class="exam-progress-fill" style="width:${((current + 1) / questions.length * 100)}%"></div>
      </div>
      
      <div class="exam-question-card" style="margin-top: 16px;">
        <div class="exam-question-text">${esc(q.question)}</div>
        <div class="test-options" id="exam_opts"></div>
        
        ${currentAnswerRevealed ? `
          <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 4px solid ${feedbackColor}; animation: fadeIn 0.3s ease;">
            <div style="font-weight: bold; color: ${feedbackColor}; margin-bottom: ${q.explanation ? '8px' : '0'}">
              ${feedbackMsg}
            </div>
            ${q.explanation ? `<div style="font-size: 13px; color: var(--text-main);"><strong>Объяснение:</strong><br>${esc(q.explanation)}</div>` : ''}
          </div>
        ` : ''}
        
        <div style="margin-top: 20px;">
          ${!currentAnswerRevealed 
            ? `<button class="btn btn-primary" id="btnCheckExam" style="width: 100%">Подтвердить ответ</button>`
            : `<button class="btn btn-primary" id="btnNextExam" style="width: 100%">${isLastQuestion ? 'Завершить экзамен ✓' : 'Следующий вопрос →'}</button>`
          }
        </div>
      </div>
    </div>
  `;

  $('btnExitExam')?.addEventListener('click', () => {
    if (confirm('Выйти из экзамена?')) { UI.examState = null; UI.view = 'home'; render(); }
  });

  const optsDiv = $('exam_opts');
  
  q.shuffledOptions.forEach((optText, i) => {
    const btn = ce('button', { cls: 'test-option' });
    btn.dataset.idx = i;
    
    btn.innerHTML = `
      <span class="test-opt-letter">${String.fromCharCode(65 + i)}</span>
      <span class="test-opt-text">${esc(optText)}</span>
    `;
    
    if (currentAnswerRevealed) {
      btn.disabled = true;
      const isCorrectAns = q.newCorrectIndices.includes(i);
      const isSelected = lastSelectedIndices.includes(i);
      
      // ЛОГИКА РАСКРАСКИ КНОПОК
      if (isPerfectMatch) {
        if (isCorrectAns) btn.classList.add('correct'); // Всё идеально - зеленые
      } else if (hasIncorrect) {
        if (isSelected && !isCorrectAns) btn.classList.add('wrong'); // Выбрал ошибку - красная
        if (isCorrectAns) btn.classList.add('correct'); // Показываем правильные - зелеными
      } else if (hasMissed) {
        if (isCorrectAns) btn.classList.add('warning'); // Забыл выбрать - оранжевые
      }

      // Сохраняем визуальное выделение рамкой для тех, куда кликал юзер
      if (isSelected) btn.classList.add('selected');

    } else {
      // Режим выбора ответа
      btn.onclick = () => btn.classList.toggle('selected');
    }
    
    optsDiv.appendChild(btn);
  });

  // Обработчики кнопок
  if (!currentAnswerRevealed) {
    $('btnCheckExam').onclick = () => {
      const selectedBtns = Array.from(optsDiv.querySelectorAll('.test-option.selected'));
      const selectedIndices = selectedBtns.map(b => parseInt(b.dataset.idx));

      if (selectedIndices.length === 0) {
        notify('Выберите хотя бы один вариант', 'warning');
        return;
      }
      // handleExamAnswer уже есть у вас в коде, он обработает данные
      handleExamAnswer(selectedIndices);
    };
  } else {
    $('btnNextExam').onclick = () => {
      UI.examState.current++;
      UI.examState.currentAnswerRevealed = false; // Сбрасываем флаг
      UI.examState.lastSelectedIndices = [];
      
      if (UI.examState.current >= questions.length) {
        UI.examState.finished = true;
      }
      render();
    };
  }
}

/* ─── ИЗМЕНЕННЫЙ HANDLE EXAM ANSWER ─── */
function handleExamAnswer(userIndices) {
  const { questions, current } = UI.examState;
  const q = questions[current];
  
  const correctArr = q.newCorrectIndices;
  const isCorrect = userIndices.length === correctArr.length && 
                    userIndices.every(idx => correctArr.includes(idx));

  UI.examState.answers.push(isCorrect);
  if (isCorrect) UI.examState.score++;

  const origTopic = findTopic(q._sectionId, q._topicId);
  if (origTopic) {
    const origQ = origTopic.tests?.find(t => t.id === q.id);
    if (origQ) {
      if (!origQ.history) origQ.history = [];
      origQ.history.push({ date: today(), correct: isCorrect });
      saveDB();
    }
  }

  // Вместо перехода к следующему вопросу, включаем режим "показа ответа"
  UI.examState.currentAnswerRevealed = true;
  UI.examState.lastSelectedIndices = userIndices;
  
  render(); 
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
  // Добавляем фиктивное состояние
history.pushState(null, null, location.href);

window.addEventListener("popstate", function () {
  const confirmExit = confirm("Вы точно хотите выйти?");
  
  if (confirmExit) {
    window.history.back();
  } else {
    history.pushState(null, null, location.href);
  }
});
}



// Сгенерируй 20 тестовых не простых вопросов по теме "[]".
// Могут быть вопросы как с одним, так и с несколькими правильными вариантами ответов.
// Выдай результат СТРОГО в формате чистого JSON-массива без форматирования Markdown, без лишнего текста до или после.
// Индексы в массиве correct должны начинаться с 0.
// Структура должна быть такой:
// [
// {
// "question": "Текст вопроса",
// "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"], "Вариант 5"],
// "correct": [0, 2],
// "explanation": "Почему именно эти варианты правильные (по простому)" 
// }
// ]
