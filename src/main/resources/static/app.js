const state = { conversations: [], filter: 'all' };
const $ = (selector) => document.querySelector(selector);

async function loadDashboard() {
  const [conversations, stats] = await Promise.all([
    fetch('/api/conversations').then(assertResponse).then((r) => r.json()),
    fetch('/api/stats').then(assertResponse).then((r) => r.json())
  ]);
  state.conversations = conversations;
  renderStats(stats);
  renderSessions();
  renderTopics(stats.topics);
  renderDailyLearning(stats.dailyLearning || []);
  loadLeaderboard();
}

function assertResponse(response) {
  if (response.status === 401) throw new Error('Please sign in to Daily Conversation, then refresh this page.');
  if (!response.ok) throw new Error('Unable to load the learning log.');
  return response;
}

function renderStats(stats) {
  $('#session-count').textContent = stats.conversationCount;
  $('#learning-time').innerHTML = `${Math.floor(stats.learningMinutes / 60)}<span>h</span> ${String(stats.learningMinutes % 60).padStart(2, '0')}<span>m</span>`;
  $('#top-topic').textContent = stats.topTopic;
}

function renderSessions() {
  const list = $('#session-list');
  const filtered = state.conversations.filter((item) => state.filter === 'all' || item.provider === state.filter);
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><span>✦</span><p>${state.conversations.length ? 'No sessions for this provider' : 'No sessions yet'}</p><small>${state.conversations.length ? 'Try another filter.' : 'Paste your first shared link above to start your learning log.'}</small></div>`;
    return;
  }
  list.innerHTML = filtered.map((item, index) => `<article class="session" data-id="${escapeAttribute(item.id)}" style="animation-delay:${Math.min(index, 8) * 35}ms">
    <div class="session-bar"></div>
    <div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="session-meta">
        <span class="provider">${escapeHtml(providerLabel(item.provider))}</span>
        <b>${escapeHtml(item.topic)}</b>
        <span>·</span>
        <span>${item.estimatedMinutes} min</span>
        <span class="effort-chip">Effort ${item.effortScore}/100</span>
      </div>
    </div>
    <div class="session-side">
      <span class="duration">${formatDate(item.importedAt)}</span>
      <button class="delete-btn" data-delete="${escapeAttribute(item.id)}" title="Delete" aria-label="Delete session">✕</button>
    </div>
  </article>`).join('');
  list.querySelectorAll('.session').forEach((item) => item.addEventListener('click', (e) => { if (e.target.closest('.delete-btn')) return; openDetail(item.dataset.id); }));
  list.querySelectorAll('.delete-btn').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteConversation(btn.dataset.delete); }));
}

function renderTopics(topics) {
  const target = $('#topic-list');
  if (!topics || !topics.length) { target.innerHTML = '<p class="muted">Your topics will appear here.</p>'; return; }
  const max = Math.max(...topics.map((topic) => topic.minutes));
  target.innerHTML = topics.slice(0, 6).map((topic) => `<div class="topic-row"><div class="topic-row-head"><span>${escapeHtml(topic.topic)}</span><span>${topic.minutes} min · ${topic.count} ${topic.count === 1 ? 'session' : 'sessions'}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${Math.max(8, Math.round(topic.minutes / max * 100))}%"></div></div></div>`).join('');
}

function renderDailyLearning(days) {
  const target = $('#daily-list');
  if (!days.length) { target.innerHTML = '<p class="muted">Your daily learning time will appear here.</p>'; return; }
  target.innerHTML = days.slice(0, 10).map((day) => `<div class="daily-row"><span>${formatDay(day.date)}</span><b>${day.minutes} min</b><small>${day.count} ${day.count === 1 ? 'session' : 'sessions'}</small></div>`).join('');
}

async function loadLeaderboard() {
  const params = new URLSearchParams({ sort: $('#leaderboard-sort').value });
  const provider = $('#leaderboard-provider').value;
  if (provider) params.set('provider', provider);
  const response = await fetch(`/api/leaderboard?${params}`);
  if (!response.ok) return;
  renderLeaderboard(await response.json());
}

function renderLeaderboard(entries) {
  const target = $('#leaderboard-list');
  if (!entries.length) { target.innerHTML = '<p class="muted">No sessions match these filters.</p>'; return; }
  target.innerHTML = entries.slice(0, 10).map((item, index) => `<article class="leaderboard-row" data-id="${escapeAttribute(item.id)}">
    <span class="rank">${String(index + 1).padStart(2, '0')}</span>
    <div>
      <h3>${escapeHtml(item.title)}</h3>
      <p><span class="provider">${escapeHtml(providerLabel(item.provider))}</span> ${escapeHtml(item.topic)} · ${formatDate(item.importedAt)}</p>
    </div>
    <div class="leaderboard-end">
      <div class="leaderboard-metrics"><b>${escapeHtml(leaderboardMetric(item))}</b><small>Effort ${item.effortScore}/100</small></div>
      <button class="delete-btn" data-delete="${escapeAttribute(item.id)}" title="Delete" aria-label="Delete session">✕</button>
    </div>
  </article>`).join('');
  target.querySelectorAll('.leaderboard-row').forEach((row) => row.addEventListener('click', (e) => { if (e.target.closest('.delete-btn')) return; openDetail(row.dataset.id); }));
  target.querySelectorAll('.leaderboard-row .delete-btn').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteConversation(btn.dataset.delete); }));
}

function leaderboardMetric(item) {
  const sort = $('#leaderboard-sort').value;
  if (sort === 'latest') return formatDate(item.importedAt);
  if (sort === 'input_tokens') return `${item.inputTokens.toLocaleString()} in tokens`;
  if (sort === 'output_tokens') return `${item.outputTokens.toLocaleString()} out tokens`;
  if (sort === 'effort') return `${item.effortScore}/100 effort`;
  return `${item.estimatedMinutes} min`;
}

function providerLabel(provider) {
  if (provider === 'OpenAI') return 'ChatGPT';
  if (provider === 'Google') return 'Gemini';
  if (provider === 'Anthropic') return 'Claude';
  return provider;
}

async function importConversation(event) {
  event.preventDefault();
  const button = $('#import-button'); const note = $('#form-note'); const url = $('#url').value.trim();
  button.disabled = true; button.innerHTML = 'Reading conversation…'; note.className = 'form-note'; note.textContent = 'Fetching the shared page and creating your learning summary.';
  try {
    const response = await fetch('/api/conversations/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Import failed.');
    $('#url').value = ''; note.className = 'form-note success'; note.textContent = 'Session added to your learning log.';
    await loadDashboard(); openDetail(payload.id);
  } catch (error) { note.className = 'form-note error'; note.textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Import session <span aria-hidden="true">→</span>'; }
}

function openDetail(id) {
  const item = state.conversations.find((conversation) => conversation.id === id); if (!item) return;
  const isStale = item.analysisStatus === 'FALLBACK_NO_API_KEY' || item.analysisStatus === 'FALLBACK_AI_ERROR' || item.effortScore === 0 || !(item.keywords || []).length;
  $('#detail-content').innerHTML = `<p class="eyebrow">${escapeHtml(providerLabel(item.provider))} · ${escapeHtml(item.topic)}</p>
    <h2>${escapeHtml(item.title)}</h2>
    <p class="detail-summary">${escapeHtml(item.context || item.summary)}</p>
    <div class="insight-row">
      <div class="effort-card">
        <span class="insight-label">Learning effort</span>
        <strong>${item.effortScore}<small>/100</small></strong>
        <div class="effort-track"><span style="width:${Math.max(0, Math.min(100, item.effortScore))}%"></span></div>
        <p>Based on observable questions, follow-ups, attempts, and application.</p>
      </div>
      <div class="detail-block">
        <h4>Keywords</h4>
        <div class="tag-list">${(item.keywords || []).map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('')}</div>
        <h4 class="mt-lg">How you learnt</h4>
        <p class="detail-method">${escapeHtml(item.studyMethod)} · ${escapeHtml(item.difficulty)}</p>
      </div>
    </div>
    <div class="detail-columns">
      <div class="detail-block"><h4>Key learnings</h4><ul>${(item.keyLearnings || []).map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>
      <div class="detail-block"><h4>Concepts</h4><div class="tag-list">${(item.concepts || []).map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('')}</div></div>
    </div>
    <div class="detail-block detail-spaced"><h4>Next steps</h4><ul>${(item.nextSteps || []).map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>
    <div class="detail-footer">
      <span>Estimated ${item.estimatedMinutes} minutes · ${formatDate(item.importedAt)}</span>
      <div class="detail-actions">
        ${isStale ? '<button id="reanalyze-btn" class="btn-ghost">Re-analyse ↻</button>' : ''}
        <button id="delete-detail-btn" class="btn-danger">Delete ✕</button>
        <a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">Open original ↗</a>
      </div>
    </div>`;
  if (isStale) {
    $('#reanalyze-btn').addEventListener('click', () => reanalyze(id));
  }
  $('#delete-detail-btn').addEventListener('click', () => deleteConversation(id, true));
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

async function deleteConversation(id, fromDetail = false) {
  if (!confirm('Delete this session? This cannot be undone.')) return;
  try {
    const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Delete failed.');
    }
    if (fromDetail) $('#detail-dialog').close();
    await loadDashboard();
  } catch (error) { alert(error.message); }
}

function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)); }
function formatDay(value) { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

$('#import-form').addEventListener('submit', importConversation);
$('#close-detail').addEventListener('click', () => $('#detail-dialog').close());
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  state.filter = button.dataset.filter;
  renderSessions();
}));
document.querySelectorAll('.sidebar nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.sidebar nav a').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));
$('#leaderboard-sort').addEventListener('change', () => loadLeaderboard().catch(() => {}));
$('#leaderboard-provider').addEventListener('change', () => loadLeaderboard().catch(() => {}));
loadDashboard().catch((error) => { $('#session-list').innerHTML = `<div class="empty"><span>!</span><p>Could not load your journal</p><small>${escapeHtml(error.message || 'Make sure the Spring Boot server is running.')}</small></div>`; });
