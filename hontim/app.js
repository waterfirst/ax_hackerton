import { STATUS, buildPlan, demoProject, detectConflicts, parseResult, nextTask, projectMetrics, serialize, makeProject } from './core.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const storeKey = 'hontim-os-v1';
let api = { key: '', model: 'openai/gpt-4.1-mini' };
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
  $('#aiStatus').textContent = api.key ? `${api.model.split('/').pop()} 연결됨` : '수동 전달 모드';
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
  <section class="drawer-section"><h3>AI 결과 인계</h3><label class="result-label">결과를 붙여 넣어줘<textarea id="resultInput" rows="7" placeholder="AI가 보고한 완료내용, 근거, 미해결사항을 붙여 넣어."></textarea></label><button class="button signal full" id="submitResult">검증 바톤 만들기</button></section>
  <section class="drawer-section task-controls"><button class="button ghost" data-status="active" ${t.lease?'disabled':''}>실행권 획득</button><button class="button ghost" data-status="review">검증 대기</button><button class="button ghost" data-status="done">통과 처리</button></section>`;
  showPanel($('#taskDrawer'));
  $('#copyPrompt').onclick = () => navigator.clipboard.writeText(prompt).then(()=>toast('작업지시서를 복사했어.'));
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
  if (!api.key) return buildPlan(input);
  const system = '너는 AI 협업 관제사다. 목표를 5~8개 검증 가능한 작업으로 분해하라. JSON만 반환하라. 각 작업: title, output, writeSet(string array), executor, reviewer, humanApproval(boolean), criteria(string array).';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${api.key}`,'HTTP-Referer':location.href,'X-Title':'HonTeam OS'}, body:JSON.stringify({ model:api.model, messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}], response_format:{type:'json_object'} }) });
  if (!response.ok) throw new Error(`AI 연결 오류 ${response.status}`);
  const data = await response.json(); const content = data.choices?.[0]?.message?.content || '{}'; const parsed = JSON.parse(content); const rows = parsed.tasks || parsed.work || [];
  if (!rows.length) throw new Error('AI가 작업 목록을 반환하지 않았어.');
  const tasks = rows.map((r,i)=>({ id:`TASK-${String(i+1).padStart(3,'0')}`, title:r.title, output:r.output||'결과물', writeSet:r.writeSet||[`work/${i+1}/*`], executor:r.executor||'제작 AI', reviewer:r.reviewer||'검증 AI', humanApproval:!!r.humanApproval, criteria:r.criteria||['결과물이 존재한다'], status:i===0?'active':'queued', lease:i===0, priority:i<2?'high':'normal', dependencies:i?[`TASK-${String(i).padStart(3,'0')}`]:[], notes:'' }));
  return makeProject({...input,tasks});
}

$('#projectForm').addEventListener('submit', async e => {
  e.preventDefault(); const form = new FormData(e.currentTarget), input = Object.fromEntries(form.entries()); const button=$('#planButton'); button.disabled=true; button.textContent='분해 중…';
  try { const p = await aiPlan(input); state.projects.push(p); state.currentId=p.id; save(); closePanels(); e.currentTarget.reset(); render(); toast(`${p.tasks.length}개 작업으로 분해했어.`); }
  catch(err) { toast(err.message || '업무 분해에 실패했어.', true); }
  finally { button.disabled=false; button.textContent='업무 분해하기'; }
});

$('#aiForm').addEventListener('submit', e => { e.preventDefault(); const f=new FormData(e.currentTarget); api={key:String(f.get('apiKey')||'').trim(),model:String(f.get('model'))}; closePanels(); render(); toast(api.key?'현재 탭에 AI를 연결했어.':'키가 없어 수동 모드를 유지해.'); });
$('#disconnectAi').onclick=()=>{api.key='';$('#aiForm').reset();closePanels();render();toast('AI 연결을 해제했어.')};
$('#newProjectButton').onclick=()=>showPanel($('#projectPanel')); $('#aiSettingsButton').onclick=()=>showPanel($('#aiPanel')); $('#closeDrawer').onclick=closePanels; $('#drawerScrim').onclick=closePanels; $$('.close-panel').forEach(b=>b.onclick=closePanels);
$('#projectSelect').onchange=e=>{state.currentId=e.target.value;save();render()};
$('#nextActionButton').onclick=()=>{const t=nextTask(project());if(t)openTask(t.id)};
$('#demoResetButton').onclick=()=>{const index=state.projects.findIndex(p=>p.id==='PROJECT-DEMO');const demo=demoProject();if(index>=0)state.projects[index]=demo;else state.projects.unshift(demo);state.currentId=demo.id;save();render();toast('데모 프로젝트를 복원했어.')};
$('#exportButton').onclick=()=>{const blob=new Blob([serialize(state.projects)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hontim-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('프로젝트 장부를 내보냈어.')};
$$('.view-tabs button').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('.filter').forEach(b=>b.onclick=()=>{taskFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderTasks(project())});
document.addEventListener('click', e=>{const target=e.target.closest('[data-task]');if(target)openTask(target.dataset.task);const resolve=e.target.closest('[data-resolve]');if(resolve){const p=project(),c=p.conflicts.find(x=>x.id===resolve.dataset.resolve),b=p.tasks.find(t=>t.id===c?.taskB);if(b){b.executor='검증 AI';b.reviewer='지휘 AI';b.status='review';b.lease=false;b.reviewOf=c.taskA;b.output=`${b.output} 독립 검증`;save();render();toast('중복 작업을 독립 검증 역할로 분리했어.')}}});
document.addEventListener('keydown', e=>{if(e.key==='Escape')closePanels();const row=e.target.closest?.('.task-row');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTask(row.dataset.task)}});
render();
