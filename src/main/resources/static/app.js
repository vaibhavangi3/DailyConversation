const state = { conversations: [], filter: 'all' };
const $ = (selector) => document.querySelector(selector);
$('#page-date').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(new Date()).toUpperCase();

async function loadDashboard() {
  const [conversations, stats] = await Promise.all([
    fetch('/api/conversations').then(assertResponse).then((r) => r.json()),
    fetch('/api/stats').then(assertResponse).then((r) => r.json())
  ]);
  state.conversations = conversations;
  renderStats(stats);
  renderSessions();
  renderTopics(stats.topics);
}

function assertResponse(response) {
  if (!response.ok) throw new Error('Unable to load the learning log.');
  return response;
}

function renderStats(stats) {
  $('#session-count').textContent = stats.conversationCount;
  $('#learning-time').innerHTML = `${Math.floor(stats.learningMinutes / 60)}<span>h</span> ${String(stats.learningMinutes % 60).padStart(2, '0')}<span>m</span>`;
  $('#topic-count').textContent = stats.topicCount;
  $('#top-topic').textContent = stats.topTopic;
}

function renderSessions() {
  const list = $('#session-list');
  const filtered = state.conversations.filter((item) => state.filter === 'all' || item.provider === state.filter);
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><span>✦</span><p>${state.conversations.length ? 'No sessions for this provider' : 'No sessions yet'}</p><small>${state.conversations.length ? 'Try another filter.' : 'Paste your first shared link above to start your learning log.'}</small></div>`;
    return;
  }
  list.innerHTML = filtered.map((item) => `<article class="session" data-id="${item.id}">
    <div class="session-bar"></div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><div class="session-meta"><span class="provider">${escapeHtml(item.provider)}</span><b>${escapeHtml(item.topic)}</b><span>·</span><span>${item.estimatedMinutes} min</span></div></div><span class="duration">${formatDate(item.importedAt)}</span>
  </article>`).join('');
  list.querySelectorAll('.session').forEach((item) => item.addEventListener('click', () => openDetail(item.dataset.id)));
}

function renderTopics(topics) {
  const target = $('#topic-list');
  if (!topics.length) { target.innerHTML = '<p class="muted">Your topics will appear here.</p>'; return; }
  const max = Math.max(...topics.map((topic) => topic.minutes));
  target.innerHTML = topics.slice(0, 6).map((topic) => `<div class="topic-row"><div class="topic-row-head"><span>${escapeHtml(topic.topic)}</span><span>${topic.minutes} min · ${topic.count} ${topic.count === 1 ? 'session' : 'sessions'}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${Math.max(8, Math.round(topic.minutes / max * 100))}%"></div></div></div>`).join('');
}

async function importConversation(event) {
  event.preventDefault();
  const button = $('#import-button'); const note = $('#form-note'); const url = $('#url').value.trim();
  button.disabled = true; button.innerHTML = 'Reading conversation…'; note.className = 'form-note'; note.textContent = 'Fetching the shared page and creating your learning summary.';
  try {
    const response = await fetch('/api/conversations/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url}) });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Import failed.');
    $('#url').value = ''; note.className = 'form-note success'; note.textContent = 'Session added to your learning log.';
    await loadDashboard(); openDetail(payload.id);
  } catch (error) { note.className = 'form-note error'; note.textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Import session <span>→</span>'; }
}

function openDetail(id) {
  const item = state.conversations.find((conversation) => conversation.id === id); if (!item) return;
  const isStale = item.analysisStatus === 'FALLBACK_NO_API_KEY' || item.analysisStatus === 'FALLBACK_AI_ERROR';
  $('#detail-content').innerHTML = `<p class="eyebrow">${escapeHtml(item.provider)} · ${escapeHtml(item.topic)}</p><h2>${escapeHtml(item.title)}</h2><p class="detail-summary">${escapeHtml(item.summary)}</p><div class="detail-columns"><div class="detail-block"><h4>KEY LEARNINGS</h4><ul>${item.keyLearnings.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div><div class="detail-block"><h4>CONCEPTS</h4><div class="tag-list">${item.concepts.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('')}</div><h4 style="margin-top:22px">HOW YOU LEARNT</h4><p style="font-size:12px;color:#526168">${escapeHtml(item.studyMethod)} · ${escapeHtml(item.difficulty)}</p></div></div><div class="detail-block" style="margin-top:24px"><h4>NEXT STEPS</h4><ul>${item.nextSteps.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div><div class="detail-footer"><span>Estimated ${item.estimatedMinutes} minutes · ${formatDate(item.importedAt)}</span><div style="display:flex;gap:12px;align-items:center">${isStale ? `<button id="reanalyze-btn" style="background:#2ec4b6;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Re-analyse ↻</button>` : ''}<a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">Open original ↗</a></div></div>`;
  if (isStale) {
    $('#reanalyze-btn').addEventListener('click', () => reanalyze(id));
  }
  $('#detail-dialog').showModal();
}

async function reanalyze(id) {
  const btn = $('#reanalyze-btn');
  btn.disabled = true; btn.textContent = 'Analysing…';
  try {
    const response = await fetch(`/api/conversations/${id}/reanalyze`, { method: 'POST' });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Re-analysis failed.');
    await loadDashboard();
    $('#detail-dialog').close();
    openDetail(id);
  } catch (error) { btn.textContent = 'Failed — try again'; btn.disabled = false; }
}

function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric' }).format(new Date(value)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

$('#import-form').addEventListener('submit', importConversation);
$('#refresh').addEventListener('click', () => loadDashboard().catch((error) => { $('#form-note').textContent = error.message; }));
$('#close-detail').addEventListener('click', () => $('#detail-dialog').close());
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; renderSessions(); }));
loadDashboard().catch(() => { $('#session-list').innerHTML = '<div class="empty"><span>!</span><p>Could not load your journal</p><small>Make sure the Spring Boot server is running.</small></div>'; });
