const STOP = new Set('그리고 위한 대한 통해 작업 프로젝트 결과 완료 생성 작성 확인 검토 사용 서비스 파일 관련 현재 다음'.split(' '));

export const STATUS = {
  queued: { label: '대기', signal: 'dim' },
  active: { label: '실행 중', signal: 'green' },
  review: { label: '검증 대기', signal: 'amber' },
  blocked: { label: '차단', signal: 'red' },
  approval: { label: '승인 필요', signal: 'amber' },
  done: { label: '통과', signal: 'cyan' }
};

const uid = (prefix = 'ID') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const clean = text => String(text || '').replace(/\s+/g, ' ').trim();
const words = text => new Set(clean(text).toLowerCase().split(/[^가-힣a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w)));

export function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  const intersection = [...A].filter(x => B.has(x)).length;
  return intersection / (A.size + B.size - intersection);
}

export function detectConflicts(tasks) {
  const conflicts = [];
  for (let i = 0; i < tasks.length; i++) for (let j = i + 1; j < tasks.length; j++) {
    const a = tasks[i], b = tasks[j];
    if (a.status === 'done' || b.status === 'done') continue;
    if (a.reviewOf === b.id || b.reviewOf === a.id) continue;
    const score = similarity(`${a.title} ${a.output}`, `${b.title} ${b.output}`);
    const sameOutput = a.output && b.output && clean(a.output).toLowerCase() === clean(b.output).toLowerCase();
    const doubleLease = a.lease && b.lease && a.writeSet?.some(x => b.writeSet?.includes(x));
    if (sameOutput || doubleLease || score >= .34) conflicts.push({
      id: uid('CONFLICT'), taskA: a.id, taskB: b.id,
      score: sameOutput || doubleLease ? .96 : score,
      reason: doubleLease ? '수정 범위가 겹친 두 작업이 동시에 실행 중' : sameOutput ? '같은 결과물을 만들도록 지정됨' : '목적과 결과물이 의미상 중복됨'
    });
  }
  return conflicts.sort((a, b) => b.score - a.score);
}

const roleFor = title => {
  if (/조사|자료|사례|근거|시장|검색/.test(title)) return '조사 AI';
  if (/검증|검사|테스트|감사|교정/.test(title)) return '검증 AI';
  if (/승인|결정|확정/.test(title)) return '사람';
  return '제작 AI';
};

export function buildPlan(input) {
  const goal = clean(input.goal);
  const publishing = /책|출판|epub|pod|isbn|원고/.test(goal.toLowerCase());
  const software = /앱|서비스|웹|개발|코드|배포/.test(goal.toLowerCase());
  const base = publishing ? [
    ['요구사항과 기준본 확정', '확정된 출판 명세', 'spec/*'],
    ['ISBN·유통 요건 조사', '출판 요건 근거표', 'evidence/*'],
    ['원고 구조와 메타데이터 작성', '원고 기준본', 'manuscript/*'],
    ['POD 인쇄 파일 제작', '인쇄용 PDF', 'build/print/*'],
    ['전자책 EPUB 변환', '검증된 EPUB', 'build/epub/*'],
    ['표지·가격 최종 승인', '승인 기록', 'approval/*'],
    ['납본·유통 체크리스트 검증', '출간 바톤', 'handoff/*']
  ] : software ? [
    ['사용자 문제와 완료조건 확정', '제품 명세', 'spec/*'],
    ['유사 서비스와 기술 제약 조사', '근거 원장', 'evidence/*'],
    ['핵심 사용자 흐름 설계', '화면 흐름', 'design/*'],
    ['작동하는 MVP 구현', '배포 가능 빌드', 'src/*'],
    ['접근성·모바일·오류 상태 검증', '검증 보고서', 'tests/*'],
    ['외부 배포 승인', '승인 기록', 'approval/*'],
    ['공개 배포와 다음 바톤 작성', '공개 링크', 'release/*']
  ] : [
    ['목표와 완료조건 확정', '작업 명세', 'spec/*'],
    ['필요 자료와 근거 조사', '근거 원장', 'evidence/*'],
    ['핵심 결과물 초안 제작', '1차 결과물', 'work/*'],
    ['독립 검증과 수정', '검증 보고서', 'review/*'],
    ['사용자 최종 승인', '승인 기록', 'approval/*'],
    ['결과 공개와 바톤 작성', '최종 결과물', 'release/*']
  ];
  const tasks = base.map((row, i) => ({
    id: `TASK-${String(i + 1).padStart(3, '0')}`, title: row[0], output: row[1], writeSet: [row[2]],
    executor: roleFor(row[0]), reviewer: roleFor(row[0]) === '검증 AI' ? '지휘 AI' : '검증 AI',
    status: i === 0 ? 'active' : 'queued', lease: i === 0, priority: i < 2 ? 'high' : 'normal',
    humanApproval: /승인|배포|가격/.test(row[0]), criteria: [`${row[1]}이 존재한다`, '근거 또는 검증 결과가 기록된다'],
    dependencies: i ? [`TASK-${String(i).padStart(3, '0')}`] : [], notes: ''
  }));
  return makeProject({ ...input, tasks });
}

export function makeProject(input) {
  const now = new Date().toISOString();
  const project = {
    id: input.id || uid('PROJECT'), name: clean(input.name) || '새 프로젝트', goal: clean(input.goal),
    deadline: input.deadline || '', canonical: clean(input.canonical) || 'project/main', constraints: clean(input.constraints),
    createdAt: input.createdAt || now, updatedAt: now, tasks: input.tasks || [], decisions: input.decisions || [],
    evidence: input.evidence || [], handoffs: input.handoffs || []
  };
  project.conflicts = detectConflicts(project.tasks);
  return project;
}

export function demoProject() {
  const p = buildPlan({ id: 'PROJECT-DEMO', name: '《혼자가 팀이 되었다》 출판', goal: 'POD와 전자책을 동시에 출판하고 ISBN 발급부터 납본까지 누락 없이 완료한다.', deadline: '2026-09-30', canonical: 'manuscript/main', constraints: '개인정보 비공개, 가격·표지·외부 게시 전 사람 승인' });
  p.tasks[0].status = 'done'; p.tasks[0].lease = false;
  p.tasks[1].status = 'review'; p.tasks[1].lease = false;
  p.tasks[2].status = 'active'; p.tasks[2].lease = true;
  p.tasks.push({ id: 'TASK-008', title: 'POD 출판 절차 가이드 작성', output: '출판 요건 근거표', writeSet: ['evidence/*'], executor: 'Claude', reviewer: '검증 AI', status: 'blocked', lease: false, priority: 'high', humanApproval: false, criteria: ['출처가 표시된다'], dependencies: [], notes: 'TASK-002와 중복 가능성' });
  p.decisions = [{ id: uid('DEC'), text: 'POD와 전자책을 동시 출간한다.', by: '사용자', at: '2026-08-31T11:06:00+09:00' }];
  p.evidence = [{ id: uid('EVD'), text: 'ISBN 979-11-220895-0-9 발급 완료', source: '국립중앙도서관 ISBN센터', verified: true }];
  p.handoffs = [{ id: uid('BATON'), taskId: 'TASK-002', at: '2026-08-31T11:20:00+09:00', summary: 'ISBN 발급과 기본 유통 요건 확인 완료', done: ['ISBN 발급 완료', '발행 후 30일 이내 납본 확인'], unresolved: ['판매가격 미정', '표지 최종 승인 필요'], next: '원고 메타데이터와 판권지를 기준본에 반영', originalChars: 4820, batonChars: 612 }];
  p.conflicts = detectConflicts(p.tasks);
  return p;
}

export function parseResult(text, task) {
  const raw = clean(text);
  const sentences = String(text).split(/\n+|(?<=[.!?다요됨])\s+/).map(clean).filter(Boolean);
  const done = sentences.filter(s => /완료|작성|생성|수정|반영|통과|확인/.test(s)).slice(0, 5);
  const unresolved = sentences.filter(s => /미완|남음|필요|실패|오류|확인 불가|TODO|보류/.test(s)).slice(0, 4);
  const decisions = sentences.filter(s => /결정|확정|채택|선택/.test(s)).slice(0, 3);
  const evidence = sentences.filter(s => /https?:\/\/|출처|근거|ISBN|검증/.test(s)).slice(0, 4);
  return {
    handoff: { id: uid('BATON'), taskId: task.id, at: new Date().toISOString(), summary: done[0] || `${task.title} 결과가 제출됨`, done: done.length ? done : ['결과 제출됨 — 검증 필요'], unresolved, next: unresolved[0] || '검증 AI가 완료조건을 재현', originalChars: raw.length, batonChars: JSON.stringify({ done, unresolved, decisions, evidence }).length },
    decisions, evidence, pass: raw.length >= 40 && done.length > 0
  };
}

export function nextTask(project) {
  return project.tasks.find(t => ['active', 'review', 'approval', 'blocked'].includes(t.status)) || project.tasks.find(t => t.status === 'queued') || project.tasks[0];
}

export function projectMetrics(project) {
  const done = project.tasks.filter(t => t.status === 'done').length;
  const original = project.handoffs.reduce((n, h) => n + (h.originalChars || 0), 0);
  const baton = project.handoffs.reduce((n, h) => n + (h.batonChars || 0), 0);
  return { done, total: project.tasks.length, active: project.tasks.filter(t => t.lease).length, approvals: project.tasks.filter(t => t.status === 'approval' || (t.humanApproval && t.status !== 'done')).length, compression: original ? Math.max(0, Math.round((1 - baton / original) * 100)) : 0 };
}

export function serialize(projects) { return JSON.stringify({ product: '혼팀 OS', version: 1, exportedAt: new Date().toISOString(), projects }, null, 2); }
