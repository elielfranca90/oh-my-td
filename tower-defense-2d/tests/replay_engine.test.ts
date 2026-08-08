import { describe, expect, it } from 'vitest';
import { ReplayEngine } from '../src/engine/ReplayEngine';
import { DatabaseManager } from '../src/engine/DatabaseManager';

describe('Deterministic Replay & Daily Seed Tests', () => {
  it('should record actions with accurate simulation ticks', () => {
    const replayEngine = new ReplayEngine(12345, 'MAP_1', 'NORMAL');
    expect(replayEngine.isRecording).toBe(true);

    replayEngine.recordAction('BUILD_TOWER', { gridX: 2, gridY: 3, towerType: 'BASIC' });
    replayEngine.advanceTick();
    replayEngine.advanceTick();

    replayEngine.recordAction('UPGRADE_TOWER', { gridX: 2, gridY: 3 });

    const exportData = replayEngine.exportReplay(10, 1500);
    expect(exportData.seed).toBe(12345);
    expect(exportData.mapId).toBe('MAP_1');
    expect(exportData.actions.length).toBe(2);
    expect(exportData.actions[0].tick).toBe(0);
    expect(exportData.actions[1].tick).toBe(2);
  });

  it('should replay recorded actions at matching ticks during playback', () => {
    const recordingEngine = new ReplayEngine(999, 'MAP_2', 'NORMAL');
    recordingEngine.recordAction('BUILD_TOWER', { gridX: 5, gridY: 5, towerType: 'CANNON' });
    recordingEngine.advanceTick();
    recordingEngine.recordAction('CAST_FREEZE');

    const replayData = recordingEngine.exportReplay(5, 800);

    const playbackEngine = new ReplayEngine();
    playbackEngine.loadReplay(replayData);

    expect(playbackEngine.isRecording).toBe(false);
    expect(playbackEngine.isReplaying).toBe(true);

    // Tick 0 actions
    const tick0Actions = playbackEngine.advanceTick();
    expect(tick0Actions.length).toBe(1);
    expect(tick0Actions[0].type).toBe('BUILD_TOWER');

    // Tick 1 actions
    const tick1Actions = playbackEngine.advanceTick();
    expect(tick1Actions.length).toBe(1);
    expect(tick1Actions[0].type).toBe('CAST_FREEZE');
  });

  it('should generate consistent daily seeds per date string', () => {
    const db = new DatabaseManager();
    const seed1 = db.getDailySeed();
    const seed2 = db.getDailySeed();
    expect(seed1).toBe(seed2);
    expect(typeof seed1).toBe('number');
    expect(seed1).toBeGreaterThan(0);
  });
});
