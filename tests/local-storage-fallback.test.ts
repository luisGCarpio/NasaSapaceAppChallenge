import assert from 'node:assert/strict';
import test from 'node:test';
import { readLocalState, saveLocalCheckin, completeLocalMission, logLocalComms, resetToDemoLocalState } from '../src/lib/local-state';

test('la demo sigue funcionando en memoria si el navegador bloquea localStorage', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const blockedWindow = { document: {}, get localStorage(): Storage { throw new Error('SecurityError'); } };
  Object.defineProperty(globalThis, 'window', { value: blockedWindow, configurable: true });
  try {
    const initial = readLocalState();
    assert.equal(initial.user.id, 'elena-demo');
    assert.equal(initial.observations.length, 7);
    const saved = saveLocalCheckin({ heart_rate: 72 }, undefined, 'blocked-storage-checkin');
    assert.equal(saved.state.currentVitals?.heart_rate, 72);
    assert.equal(readLocalState().currentVitals?.heart_rate, 72);
    assert.equal(saveLocalCheckin({ heart_rate: 72 }, undefined, 'blocked-storage-checkin').deduplicated, true);
    const completed = completeLocalMission('rest');
    assert.ok(completed.awardedXp > 0);
    assert.equal(readLocalState().gamification.missions.find((mission) => mission.id === 'rest')?.completed, true);
    logLocalComms({ message: 'Prueba', overallStatus: 'GREEN', readinessScore: 90, copiedToClipboard: false });
    assert.equal(readLocalState().commsLog[0].message, 'Prueba');
    assert.equal(resetToDemoLocalState().observations.length, 7);
    assert.equal(readLocalState().observations.length, 7);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
