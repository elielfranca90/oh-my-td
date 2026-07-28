import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../src/engine/DatabaseManager';
import { TalentManager } from '../src/engine/TalentManager';
import { AchievementManager } from '../src/engine/AchievementManager';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('E2E Database & UI Integration Flow', () => {
  let db: DatabaseManager;
  let talentManager: TalentManager;
  let achievementManager: AchievementManager;

  beforeEach(() => {
    localStorage.clear();
    db = new DatabaseManager();

    const mockClient = {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: 'e2e-player-999' } } },
        }),
        signInAnonymously: async () => ({
          data: { user: { id: 'e2e-player-999' } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'e2e-player-999', username: 'LegendaryDefender', avatar_id: 'solar_prism' },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        if (table === 'player_state') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    stars: 50,
                    talent_damage_lvl: 5,
                    talent_gold_lvl: 3,
                    talent_hp_lvl: 2,
                    talent_cd_lvl: 1,
                    talent_repair_lvl: 0,
                    talent_crit_lvl: 0,
                  },
                  error: null,
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        if (table === 'player_achievements') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  { achievement_id: 'FIRST_BLOOD', progress: 1, unlocked_at: '2026-07-28T00:00:00Z' },
                  { achievement_id: 'BOSS_SLAYER', progress: 5, unlocked_at: '2026-07-28T00:00:00Z' },
                ],
                error: null,
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        if (table === 'runs') {
          return {
            insert: async () => ({ error: null }),
          };
        }
        if (table === 'top_20_leaderboard') {
          return {
            select: async () => ({
              data: [
                {
                  username: 'LegendaryDefender',
                  avatar_id: 'solar_prism',
                  wave_reached: 35,
                  gold_earned: 4500,
                  total_kills: 320,
                  map_id: 'MAP_1',
                  challenge_mode: 'NORMAL',
                  created_at: '2026-07-28T12:00:00Z',
                },
              ],
              error: null,
            }),
          };
        }
        return {};
      },
    };

    db.client = mockClient as unknown as SupabaseClient;
  });

  it('should end-to-end sync remote player state into TalentManager on startup', async () => {
    talentManager = new TalentManager(db);
    await talentManager.syncWithRemote();

    expect(talentManager.stars).toBe(50);
    expect(talentManager.talents.damageLvl).toBe(5);
    expect(talentManager.talents.goldLvl).toBe(3);
  });

  it('should end-to-end sync remote achievements into AchievementManager on startup', async () => {
    talentManager = new TalentManager(db);
    achievementManager = new AchievementManager(talentManager, db);
    await achievementManager.syncWithRemote();

    expect(achievementManager.achievements.FIRST_BLOOD.unlocked).toBe(true);
    expect(achievementManager.achievements.BOSS_SLAYER.unlocked).toBe(true);
    expect(achievementManager.achievements.BOSS_SLAYER.progress).toBe(5);
  });

  it('should end-to-end update profile and fetch top leaderboard entries', async () => {
    const updateRes = await db.updateProfile('LegendaryDefender', 'solar_prism');
    expect(updateRes.success).toBe(true);

    const leaderboard = await db.getTop20Leaderboard();
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].username).toBe('LegendaryDefender');
    expect(leaderboard[0].wave_reached).toBe(35);
  });
});
