import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, demoProject, detectConflicts, parseResult, projectMetrics, similarity } from './core.mjs';

test('software goal becomes a runnable plan', () => {
  const p = buildPlan({ name:'앱', goal:'AI 웹 서비스를 개발하고 배포한다' });
  assert.ok(p.tasks.length >= 6);
  assert.equal(p.tasks.filter(t => t.lease).length, 1);
  assert.match(p.tasks.at(-1).title, /배포/);
});

test('duplicate output is detected', () => {
  const tasks = [
    {id:'A',title:'출판 가이드 작성',output:'출판 요건표',status:'active'},
    {id:'B',title:'POD 절차 정리',output:'출판 요건표',status:'queued'}
  ];
  assert.equal(detectConflicts(tasks).length, 1);
  assert.ok(detectConflicts(tasks)[0].score > .9);
});

test('handoff parser separates done and unresolved', () => {
  const out = parseResult('ISBN 발급을 완료했다. 판권지를 작성했다. 판매가격 결정이 필요하다. 출처 https://example.com 검증.', {id:'TASK-1',title:'출판 준비'});
  assert.ok(out.handoff.done.length >= 2);
  assert.ok(out.handoff.unresolved.length >= 1);
  assert.equal(out.pass, true);
});

test('demo includes conflict and compression', () => {
  const p = demoProject(), m = projectMetrics(p);
  assert.ok(p.conflicts.length >= 1);
  assert.ok(m.compression > 70);
  assert.ok(similarity('POD 출판 가이드', 'POD 출판 절차') > 0);
});
