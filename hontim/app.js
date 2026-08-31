import { STATUS, buildPlan, demoProject, detectConflicts, parseResult, nextTask, projectMetrics, serialize, makeProject } from './core.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const storeKey = 'hontim-os-v1';
const defaultBridgeUrl = location.hostname.endsWith('waterfirst.pro') ? `${location.origin}/hontim-api` : 'https://waterfirst.pro/hontim-api';
let bridge = { url: defaultBridgeUrl, token: '', main: 'codex', auxiliaries: [], connected: false, providers: {} };
let state = load();
let currentView = 'control', taskFilter = 'all', openTaskId = null;

function load() {
  try { const saved = JSON.parse(localStorage.getItem(storeKey)); if (saved?.projects?.length) return saved; } catch {}
  return { projects: [demoProject()], currentId: 'PROJECT-DEMO' };
}
function save() { localStorage.setItem(storeKey, JSON.stringify(state)); }
function project() { return state.projects.find(p => p.id === state.currentId) || state.projects[0]; }
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
const date = value => value ? new Intl.DateTimeFormat('ko-KR', { month:'short', day:'numeric', hour:value.includes?.('T')?'2-digit':undefined, minute:value.includes?.('T')?'2-digit':undefined }).format(new Date(value)) : '미정';
function toast(message, bad = false) { const el = $('#toast'); el.textContent = message; el.classList.toggle('bad', bad); el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

function render() {
  const p = project(); if (!p) return;
  p.conflicts = detectConflicts(p.tasks);
  const m = projectMetrics(p);
  $('#projectSelect').innerHTML = state.projects.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected':''}>${esc(x.name)}</option>`).join('');
  $('#missionTitle').textContent = p.name; $('#missionGoal').textContent = p.goal; $('#missionPath').textContent = `${p.id} / CONTROL`;
  $('#canonicalRoot').textContent = p.canonical; $('#deadline').textContent = date(p.deadline); $('#activeLeases').textContent = `${m.active}개`; $('#approvalCount').textContent = `${m.approvals}건`;
  $('#routeProgress').textContent = `${m.done}/${m.total} 통과`; $('#taskCountBadge').textContent = p.tasks.length; $('#handoffCountBadge').textContent = p.handoffs.length; $('#evidenceCountBadge').textContent = p.evidence.length + p.decisions.length;
  renderRoute(p); renderConflicts(p); renderTasks(p); renderHandoffs(p, m); renderEvidence(p);
  $('#aiStatus').textContent = bridge.connected ? `${bridge.main === 'codex' ? 'Codex' : 'Claude'} 메인 · 구독 연결` : '수동 전달 모드';
}

function renderRoute(p) {
  $('#routeMap').innerHTML = p.tasks.map((t, i) => `<button class="route-stop ${esc(t.status)}" data-task="${esc(t.id)}" aria-label="${esc(t.id)} ${esc(t.title)} ${STATUS[t.status]?.label || ''}">
    <span class="route-code">${String(i + 1).padStart(2,'0')}</span><i class="signal ${STATUS[t.status]?.signal || 'dim'}"></i><span><strong>${esc(t.title)}</strong><small>${esc(t.executor)}</small></span>
  </button>`).join('');
}

function renderConflicts(p) {
  const box = $('#conflictBanner');
  if (!p.conflicts.length) { box.hidden = true; return; }
  const c = p.conflicts[0], a = p.tasks.find(t => t.id === c.taskA), b = p.tasks.find(t => t.id === c.taskB);
  box.hidden = false; box.innerHTML = `<div class="conflict-signal"><i></i><i></i></div><div><strong>작업 충돌 ${Math.round(c.score*100)}%</strong><p>${esc(a?.title)} ↔ ${esc(b?.title)} · ${esc(c.reason)}</p></div><button data-resolve="${esc(c.id)}">역할 분리</button>`;
}

function taskVisible(t) {
  if (taskFilter === 'attention') return ['blocked','approval','review'].includes(t.status) || t.humanApproval;
  if (taskFilter === 'mine') return t.lease || t.status === 'active';
  return true;
}
function renderTasks(p) {
  const order = ['active','blocked','review','approval','queued','done'];
  const tasks = [...p.tasks].filter(taskVisible).sort((a,b) => order.indexOf(a.status)-order.indexOf(b.status));
  $('#taskBoard').innerHTML = tasks.length ? tasks.map(t => `<article class="task-row ${esc(t.status)}" tabindex="0" data-task="${esc(t.id)}">
    <div class="task-signal"><i class="signal ${STATUS[t.status]?.signal || 'dim'}"></i><span>${esc(t.id)}</span></div>
    <div class="task-main"><h3>${esc(t.title)}</h3><p>${esc(t.output)}</p><span class="mobile-state ${esc(t.status)}">${esc(STATUS[t.status]?.label || t.status)}${t.lease ? ' · 점유됨' : ''}</span></div>
    <div class="task-role"><span>실행</span><strong>${esc(t.executor)}</strong></div>
    <div class="task-role"><span>검증</span><strong>${esc(t.reviewer)}</strong></div>
    <div class="task-state"><span>${t.lease ? '점유됨' : '진입 가능'}</span><strong>${esc(STATUS[t.status]?.label || t.status)}</strong></div>
    <button aria-label="${esc(t.title)} 열기">열기</button>
  </article>`).join('') : '<div class="empty-state"><strong>이 조건에 맞는 작업이 없어.</strong><p>필터를 바꾸거나 새 프로젝트를 만들어봐.</p></div>';
}

function renderHandoffs(p, m) {
  $('#compressionValue').textContent = `${m.compression}%`; $('#compressionBar').style.setProperty('--meter-scale', String(m.compression / 100));
  $('#compressionCopy').textContent = p.handoffs.length ? `긴 대화 대신 ${p.handoffs.length}개의 검증 가능한 바톤만 전달하고 있어.` : '바톤을 만들면 예상 절감량을 계산해.';
  $('#handoffList').innerHTML = p.handoffs.length ? [...p.handoffs].reverse().map(h => `<article class="handoff-entry"><header><span>${esc(h.taskId)}</span><time>${date(h.at)}</time></header><h3>${esc(h.summary)}</h3><div class="handoff-columns"><div><strong>통과</strong><ul>${(h.done||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><strong>미해결</strong><ul>${(h.unresolved||[]).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>없음</li>'}</ul></div></div><footer><span>다음</span>${esc(h.next)}</footer></article>`).join('') : '<div class="empty-state"><strong>아직 바톤이 없어.</strong><p>작업 결과를 제출하면 자동으로 생성해.</p></div>';
}

function renderEvidence(p) {
  $('#decisionList').innerHTML = p.decisions.length ? p.decisions.map(d => `<article><i class="ledger-mark decided"></i><div><strong>${esc(d.text)}</strong><p>${esc(d.by)} · ${date(d.at)}</p></div></article>`).join('') : '<div class="empty-state">확정 결정 없음</div>';
  $('#evidenceList').innerHTML = p.evidence.length ? p.evidence.map(e => `<article><i class="ledger-mark ${e.verified?'verified':'pending'}"></i><div><strong>${esc(e.text)}</strong><p>${esc(e.source || '출처 확인 필요')} · ${e.verified?'검증됨':'검증 대기'}</p></div></article>`).join('') : '<div class="empty-state">등록된 근거 없음</div>';
}

function openTask(id) {
  const p = project(), t = p.tasks.find(x => x.id === id); if (!t) return;
  openTaskId = id; $('#drawerTaskId').textContent = `${t.id} · ${STATUS[t.status]?.label}`; $('#drawerTitle').textContent = t.title;
  const prompt = `TASK_ID: ${t.id}\nPROJECT: ${p.name}\nGOAL: ${p.goal}\nTASK: ${t.title}\nOUTPUT: ${t.output}\nWRITE_SET: ${(t.writeSet||[]).join(', ')}\nACCEPTANCE:\n${(t.criteria||[]).map(x=>'- '+x).join('\n')}\nCONSTRAINTS: ${p.constraints || '없음'}\nREPORT: 완료내용, 근거, 미해결, 다음 행동만 보고하라.`;
  $('#drawerContent').innerHTML = `<section class="drawer-section"><h3>운행 권한</h3><dl class="task-details"><div><dt>실행자</dt><dd>${esc(t.executor)}</dd></div><div><dt>검증자</dt><dd>${esc(t.reviewer)}</dd></div><div><dt>수정범위</dt><dd>${esc((t.writeSet||[]).join(', '))}</dd></div></dl></section>
  <section class="drawer-section"><div class="drawer-section-head"><h3>AI 작업지시서</h3><button class="text-button" id="copyPrompt">복사</button></div><pre id="workOrder">${esc(prompt)}</pre></section>
  <section class="drawer-section ai-run-section"><div class="drawer-section-head"><h3>AI 협업 실행</h3><span class="run-role">${bridge.connected ? `${bridge.main === 'codex' ? 'Codex' : 'Claude'} → ${bridge.main === 'codex' ? 'Claude' : 'Codex'} 검증` : '브리지 연결 필요'}</span></div><p>메인이 수행하고 서브가 독립 검토한 뒤 메인이 최종 정리해.</p><label>실행 권한<select id="runMode"><option value="plan">분석 전용 · 파일 수정 없음</option><option value="execute">허용 폴더 파일 수정</option></select></label><button class="button primary full" id="runWithAi" ${bridge.connected ? '' : 'disabled'}>협업 실행</button><p class="inline-error" id="runError" hidden></p></section>
  <section class="drawer-section"><h3>AI 결과 인계</h3><label class="result-label">결과를 확인해<textarea id="resultInput" rows="9" placeholder="협업 실행 결과가 여기에 들어와. 수동으로 붙여 넣어도 돼."></textarea></label><button class="button signal full" id="submitResult">검증 바톤 만들기</button></section>
  <section class="drawer-section task-controls"><button class="button ghost" data-status="active" ${t.lease?'disabled':''}>실행권 획득</button><button class="button ghost" data-status="review">검증 대기</button><button class="button ghost" data-status="done">통과 처리</button></section>`;
  showPanel($('#taskDrawer'));
  $('#copyPrompt').onclick = () => navigator.clipboard.writeText(prompt).then(()=>toast('작업지시서를 복사했어.'));
  $('#runWithAi').onclick = () => runTaskWithBridge(t, prompt);
  $('#submitResult').onclick = () => submitResult(t);
  $$('#drawerContent [data-status]').forEach(b => b.onclick = () => updateStatus(t, b.dataset.status));
}

function submitResult(task) {
  const text = $('#resultInput').value.trim(); if (text.length < 20) return toast('결과를 조금 더 구체적으로 붙여 넣어줘.', true);
  const p = project(), parsed = parseResult(text, task); p.handoffs.push(parsed.handoff);
  parsed.decisions.forEach(x => p.decisions.push({ id: crypto.randomUUID(), text:x, by:task.executor, at:new Date().toISOString() }));
  parsed.evidence.forEach(x => p.evidence.push({ id:crypto.randomUUID(), text:x, source:'AI 결과 — 독립 확인 필요', verified:false }));
  task.status = parsed.pass ? 'review' : 'blocked'; task.lease = false; p.updatedAt = new Date().toISOString(); save(); closePanels(); render(); toast(parsed.pass ? '바톤 생성 완료. 검증 대기로 전환했어.' : '결과가 불충분해 작업을 차단했어.', !parsed.pass);
}

function updateStatus(task, status) {
  const p = project();
  if (status === 'active') {
    const occupied = p.tasks.find(t => t.lease && t.id !== task.id && t.writeSet?.some(x => task.writeSet?.includes(x)));
    if (occupied) return toast(`${occupied.id}가 같은 구간을 점유 중이야.`, true);
    task.lease = true;
  } else task.lease = false;
  task.status = status; p.updatedAt = new Date().toISOString(); save(); closePanels(); render(); toast(`${task.id} 상태를 ${STATUS[status].label}(으)로 바꿨어.`);
}

function showPanel(panel) { closePanels(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); $('#drawerScrim').hidden = false; setTimeout(()=>panel.querySelector('button,input,textarea,select')?.focus(),80); }
function closePanels() { $$('.drawer.open').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')}); $('#drawerScrim').hidden = true; openTaskId = null; }
function setView(view) { currentView = view; $$('.view-tabs button').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))}); $$('.view').forEach(v=>{const on=v.id===`${view}View`;v.hidden=!on;v.classList.toggle('active',on)}); }

async function aiPlan(input) {
  if (!bridge.connected) return buildPlan(input);
  const parsed = await bridgeFetch('/v1/plan', { ...input, main:bridge.main, workspace:'default' });
  const rows = parsed.tasks || [];
  if (!rows.length) throw new Error('AI가 작업 목록을 반환하지 않았어.');
  const tasks = rows.map((r,i)=>({ id:`TASK-${String(i+1).padStart(3,'0')}`, title:r.title, output:r.output||'결과물', writeSet:r.writeSet||[`work/${i+1}/*`], executor:r.executor||'제작 AI', reviewer:r.reviewer||'검증 AI', humanApproval:!!r.humanApproval, criteria:r.criteria||['결과물이 존재한다'], status:i===0?'active':'queued', lease:i===0, priority:i<2?'high':'normal', dependencies:i?[`TASK-${String(i).padStart(3,'0')}`]:[], notes:'' }));
  return makeProject({...input,tasks});
}

async function bridgeFetch(path, body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 360000);
  try {
    const response = await fetch(`${bridge.url.replace(/\/$/, '')}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Authorization':`Bearer ${bridge.token}`, ...(body ? {'Content-Type':'application/json'} : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data = {}; try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.detail || `브리지 오류 ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI 실행이 6분을 넘겨 중단됐어.');
    throw error;
  } finally { clearTimeout(timer); }
}

function renderProviders() {
  const names = { codex:'Codex CLI', claude:'Claude Code', gemini:'Gemini', deepseek:'DeepSeek', zai:'Z.AI' };
  const rows = Object.entries(bridge.providers);
  $('#providerList').innerHTML = rows.length ? rows.map(([key, value]) => `<div class="provider-row"><i class="${value.connected ? 'online' : 'offline'}"></i><span><strong>${names[key] || key}</strong><small>${esc(value.detail || '상태 미확인')}</small></span><b>${value.connected ? '연결' : '대기'}</b></div>`).join('') : '<p class="provider-empty">브리지에 연결하면 로그인 상태를 확인해.</p>';
}

async function checkProviders(showMessage = true) {
  const button = $('#connectAi'); button.disabled = true; button.textContent = '확인 중…';
  $('#aiFormError').hidden = true;
  try {
    const data = await bridgeFetch('/v1/providers');
    bridge.providers = data.providers || {}; bridge.connected = !!(bridge.providers.codex?.connected && bridge.providers.claude?.connected);
    renderProviders(); render();
    if (!bridge.connected) throw new Error('Codex와 Claude 구독 로그인을 모두 확인해야 해.');
    if (showMessage) toast('구독 CLI 두 개를 연결했어.');
    return true;
  } catch (error) {
    bridge.connected = false; render();
    const box = $('#aiFormError'); box.textContent = error.message || '브리지 연결에 실패했어.'; box.hidden = false;
    return false;
  } finally { button.disabled = false; button.textContent = '상태 확인·연결'; }
}

async function runTaskWithBridge(task, prompt) {
  const button = $('#runWithAi'), errorBox = $('#runError'), mode = $('#runMode').value;
  if (mode === 'execute' && !confirm('허용된 작업폴더 안에서 메인 AI의 파일 수정을 허용할까?')) return;
  button.disabled = true; button.textContent = mode === 'execute' ? '수행·검증 중…' : '분석·검증 중…'; errorBox.hidden = true;
  try {
    const result = await bridgeFetch('/v1/orchestrate', { task:prompt, main:bridge.main, mode, auxiliaries:bridge.auxiliaries, workspace:'default' });
    $('#resultInput').value = result.final || result.draft || '';
    task.notes = `메인 ${result.main}, 검증 ${result.secondary}, 모드 ${result.mode}`;
    save(); toast('메인 수행·독립 검토·최종 정리가 끝났어.');
  } catch (error) {
    errorBox.textContent = error.message || '협업 실행에 실패했어.'; errorBox.hidden = false; toast(errorBox.textContent, true);
  } finally { button.disabled = false; button.textContent = '협업 실행'; }
}

$('#projectForm').addEventListener('submit', async e => {
  e.preventDefault(); const form = new FormData(e.currentTarget), input = Object.fromEntries(form.entries()); const button=$('#planButton'); button.disabled=true; button.textContent='분해 중…';
  try { const p = await aiPlan(input); state.projects.push(p); state.currentId=p.id; save(); closePanels(); e.currentTarget.reset(); render(); toast(`${p.tasks.length}개 작업으로 분해했어.`); }
  catch(err) { toast(err.message || '업무 분해에 실패했어.', true); }
  finally { button.disabled=false; button.textContent='업무 분해하기'; }
});

$('#aiForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(e.currentTarget);
  bridge.url = String(f.get('bridgeUrl') || '').trim().replace(/\/$/, ''); bridge.token = String(f.get('bridgeToken') || '').trim(); bridge.main = String(f.get('main') || 'codex'); bridge.auxiliaries = f.getAll('auxiliary').map(String);
  const ok = await checkProviders(); if (ok) { closePanels(); render(); }
});
$('#refreshProviders').onclick=()=>checkProviders(false);
$('#disconnectAi').onclick=()=>{bridge.token='';bridge.connected=false;bridge.providers={};$('#aiForm').reset();$('#aiForm [name="bridgeUrl"]').value=defaultBridgeUrl;renderProviders();closePanels();render();toast('AI 브리지 연결을 해제했어.')};
$('#newProjectButton').onclick=()=>showPanel($('#projectPanel')); $('#aiSettingsButton').onclick=()=>{showPanel($('#aiPanel'));$('#aiForm [name="bridgeUrl"]').value=bridge.url;$('#aiForm [name="bridgeToken"]').value=bridge.token;$('#aiForm [name="main"][value="'+bridge.main+'"]').checked=true;$$('#aiForm [name="auxiliary"]').forEach(x=>x.checked=bridge.auxiliaries.includes(x.value));renderProviders()}; $('#closeDrawer').onclick=closePanels; $('#drawerScrim').onclick=closePanels; $$('.close-panel').forEach(b=>b.onclick=closePanels);
$('#projectSelect').onchange=e=>{state.currentId=e.target.value;save();render()};
$('#nextActionButton').onclick=()=>{const t=nextTask(project());if(t)openTask(t.id)};
$('#demoResetButton').onclick=()=>{const index=state.projects.findIndex(p=>p.id==='PROJECT-DEMO');const demo=demoProject();if(index>=0)state.projects[index]=demo;else state.projects.unshift(demo);state.currentId=demo.id;save();render();toast('데모 프로젝트를 복원했어.')};
$('#exportButton').onclick=()=>{const blob=new Blob([serialize(state.projects)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hontim-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('프로젝트 장부를 내보냈어.')};
$$('.view-tabs button').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('.filter').forEach(b=>b.onclick=()=>{taskFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderTasks(project())});
document.addEventListener('click', e=>{const target=e.target.closest('[data-task]');if(target)openTask(target.dataset.task);const resolve=e.target.closest('[data-resolve]');if(resolve){const p=project(),c=p.conflicts.find(x=>x.id===resolve.dataset.resolve),b=p.tasks.find(t=>t.id===c?.taskB);if(b){b.executor='검증 AI';b.reviewer='지휘 AI';b.status='review';b.lease=false;b.reviewOf=c.taskA;b.output=`${b.output} 독립 검증`;save();render();toast('중복 작업을 독립 검증 역할로 분리했어.')}}});
document.addEventListener('keydown', e=>{if(e.key==='Escape')closePanels();const row=e.target.closest?.('.task-row');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTask(row.dataset.task)}});
render();
