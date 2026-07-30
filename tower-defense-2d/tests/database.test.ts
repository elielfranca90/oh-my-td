import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../src/engine/DatabaseManager';

import { vi } from 'vitest';

describe('DatabaseManager Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  });
  it('should initialize gracefully in offline mode when env vars are missing', () => {
    const db = new DatabaseManager();
    expect(db.client).toBeNull();
    expect(db.isConnected()).toBe(false);
  });

  it('should queue player state sync in localStorage outbox when offline', () => {
    const db = new DatabaseManager();
    db.queuePlayerStateSync(10, {
      damageLvl: 1,
      goldLvl: 2,
      hpLvl: 0,
      cdLvl: 0,
      repairLvl: 0,
      critLvl: 0,
    });

    const stored = localStorage.getItem('td2d_sync_queue_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.playerState).toEqual({
      stars: 10,
      talents: {
        damageLvl: 1,
        goldLvl: 2,
        hpLvl: 0,
        cdLvl: 0,
        repairLvl: 0,
        critLvl: 0,
      },
    });
  });

  it('should queue achievement progress in localStorage outbox when offline', () => {
    const db = new DatabaseManager();
    db.queueAchievementSync('FIRST_BLOOD', 1, true);

    const stored = localStorage.getItem('td2d_sync_queue_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.achievements).toEqual({
      FIRST_BLOOD: { progress: 1, unlocked: true },
    });
  });

  it('should queue run records in localStorage outbox when offline', () => {
    const db = new DatabaseManager();
    db.queueRunRecord('MAP_1', 'NORMAL', 15, 1200, 150);

    const stored = localStorage.getItem('td2d_sync_queue_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.pendingRuns).toHaveLength(1);
    expect(parsed.pendingRuns[0]).toEqual({
      mapId: 'MAP_1',
      challengeMode: 'NORMAL',
      waveReached: 15,
      goldEarned: 1200,
      totalKills: 150,
    });
  });

  it('should persist profile locally and queue it when offline', async () => {
    const db = new DatabaseManager();
    const res = await db.updateProfile('HeroPlayer', 'solar_prism');

    // Offline nao e mais falha: o perfil e local-first, igual estrelas e talentos.
    expect(res.success).toBe(true);
    expect(res.pending).toBe(true);

    expect(db.loadLocalProfile()).toEqual({
      username: 'HeroPlayer',
      avatarId: 'solar_prism',
    });

    const parsed = JSON.parse(localStorage.getItem('td2d_sync_queue_v1')!);
    expect(parsed.profile).toEqual({ username: 'HeroPlayer', avatarId: 'solar_prism' });
  });

  it('should keep the local profile across DatabaseManager instances', async () => {
    const first = new DatabaseManager();
    await first.updateProfile('skadi', 'solar_prism');

    // Nova instancia (novo carregamento do jogo) nao pode perder o perfil.
    const second = new DatabaseManager();
    expect(second.loadLocalProfile()).toEqual({ username: 'skadi', avatarId: 'solar_prism' });
  });

  it('should report the local profile when offline instead of losing it', async () => {
    const db = new DatabaseManager();
    await db.updateProfile('skadi', 'mega_boss');

    const res = await db.syncProfileWithRemote();
    expect(res.profile).toEqual({ username: 'skadi', avatarId: 'mega_boss' });
    expect(res.remoteOk).toBe(false);
    expect(res.pending).toBe(true);
  });

  it('should return empty array for leaderboard when offline', async () => {
    const db = new DatabaseManager();
    const list = await db.getTop20Leaderboard();
    expect(list).toEqual([]);
  });

  describe('Online Mock Operations', () => {
    let mockSupabaseClient: unknown;

    beforeEach(() => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');
      mockSupabaseClient = {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'mock-user-123' } } },
          }),
          signInAnonymously: async () => ({
            data: { user: { id: 'mock-user-123' } },
            error: null,
          }),
        },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'mock-user-123', username: 'TestPlayer', avatar_id: 'mega_boss' },
                    error: null,
                  }),
                }),
              }),
              upsert: async (_payload: unknown) => ({ error: null }),
            };
          }
          if (table === 'player_state') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      stars: 25,
                      talent_damage_lvl: 3,
                      talent_gold_lvl: 2,
                      talent_hp_lvl: 1,
                      talent_cd_lvl: 0,
                      talent_repair_lvl: 0,
                      talent_crit_lvl: 0,
                    },
                    error: null,
                  }),
                }),
              }),
              upsert: async (_payload: unknown) => ({ error: null }),
            };
          }
          if (table === 'player_achievements') {
            return {
              select: () => ({
                eq: async () => ({
                  data: [
                    { achievement_id: 'FIRST_BLOOD', progress: 1, unlocked_at: '2026-01-01T00:00:00Z' },
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
                    username: 'Champion',
                    avatar_id: 'mega_boss',
                    wave_reached: 50,
                    gold_earned: 9999,
                    total_kills: 500,
                    map_id: 'MAP_1',
                    challenge_mode: 'NORMAL',
                    created_at: '2026-07-28T00:00:00Z',
                  },
                ],
                error: null,
              }),
            };
          }
          return {};
        },
      };
    });
    it('should authenticate user and flush sync queue online', async () => {
      const db = new DatabaseManager();
      db.client = mockSupabaseClient as unknown as SupabaseClient;

      db.queuePlayerStateSync(15, {
        damageLvl: 2,
        goldLvl: 1,
        hpLvl: 0,
        cdLvl: 0,
        repairLvl: 0,
        critLvl: 0,
      });

      db.queueRunRecord('MAP_1', 'NORMAL', 20, 3000, 200);

      await db.flushSyncQueue();

      const remainingQueue = localStorage.getItem('td2d_sync_queue_v1');
      expect(remainingQueue).toBeNull();
    });
    it('should fetch user profile from Supabase online', async () => {
      const db = new DatabaseManager();
      db.client = mockSupabaseClient as unknown as SupabaseClient;

      const profile = await db.getProfile();
      expect(profile).not.toBeNull();
      expect(profile?.username).toBe('TestPlayer');
      expect(profile?.avatarId).toBe('mega_boss');
    });
    it('should update profile and handle unique constraint error', async () => {
      const db = new DatabaseManager();
      const baseMock = mockSupabaseClient as Record<string, unknown>;
      db.client = {
        ...baseMock,
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              upsert: async () => ({
                error: { code: '23505', message: 'duplicate key value violates unique constraint' },
              }),
            };
          }
          return (baseMock.from as (t: string) => unknown)(table);
        },
      } as unknown as SupabaseClient;

      const res = await db.updateProfile('ExistingUser', 'solar_prism');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Este nome de usuário já está em uso.');
      // Nome tomado por outro jogador nunca sera aceito: nao suja o local.
      expect(db.loadLocalProfile()).toBeNull();
    });

    it('should upsert the profile so a missing row is created, not silently skipped', async () => {
      const db = new DatabaseManager();
      const baseMock = mockSupabaseClient as Record<string, unknown>;
      let upsertPayload: Record<string, unknown> | null = null;

      db.client = {
        ...baseMock,
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              upsert: async (payload: Record<string, unknown>) => {
                upsertPayload = payload;
                return { error: null };
              },
            };
          }
          return (baseMock.from as (t: string) => unknown)(table);
        },
      } as unknown as SupabaseClient;

      const res = await db.updateProfile('skadi', 'solar_prism');
      expect(res.success).toBe(true);
      expect(res.pending).toBeUndefined();
      // O id tem que ir no payload, senao o upsert nao sabe em qual linha conflitar.
      expect(upsertPayload).toEqual({
        id: 'mock-user-123',
        username: 'skadi',
        avatar_id: 'solar_prism',
      });
    });

    it('should prefer the local profile over the remote one and re-queue the difference', async () => {
      const db = new DatabaseManager();
      db.client = mockSupabaseClient as unknown as SupabaseClient;

      // Local tem o nome real; o remoto e o Player_* recem-criado pelo trigger.
      localStorage.setItem(
        'td2d_profile_v1',
        JSON.stringify({ username: 'skadi', avatarId: 'solar_prism' })
      );

      const res = await db.syncProfileWithRemote();
      expect(res.profile).toEqual({ username: 'skadi', avatarId: 'solar_prism' });
      expect(res.remoteOk).toBe(true);
      expect(res.pending).toBe(true);
    });

    it('should adopt the remote profile when there is no local one', async () => {
      const db = new DatabaseManager();
      db.client = mockSupabaseClient as unknown as SupabaseClient;

      const res = await db.syncProfileWithRemote();
      expect(res.profile).toEqual({ username: 'TestPlayer', avatarId: 'mega_boss' });
      expect(res.pending).toBe(false);
      // E grava local, para o proximo carregamento nao depender da rede.
      expect(db.loadLocalProfile()).toEqual({ username: 'TestPlayer', avatarId: 'mega_boss' });
    });

    it('should share a single anonymous sign-in across concurrent ensureAuth callers', async () => {
      let signInCount = 0;
      const db = new DatabaseManager();
      db.client = {
        auth: {
          getSession: async () => ({ data: { session: null } }),
          signInAnonymously: async () => {
            signInCount++;
            const id = `anon-${signInCount}`;
            // Janela de concorrencia: os outros chamadores chegam antes de userId existir.
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { data: { user: { id } }, error: null };
          },
        },
        from: () => ({}),
      } as unknown as SupabaseClient;

      const ids = await Promise.all([
        db.ensureAuth(),
        db.ensureAuth(),
        db.ensureAuth(),
        db.ensureAuth(),
        db.ensureAuth(),
      ]);

      // Este era o bug: 5 chamadores viravam 5 usuarios anonimos e a identidade
      // do jogador mudava a cada carregamento, levando o perfil salvo com ela.
      expect(signInCount).toBe(1);
      expect(new Set(ids).size).toBe(1);
      expect(ids[0]).toBe('anon-1');
      expect(db.getUserId()).toBe('anon-1');
    });
    it('should fetch top 20 leaderboard entries online', async () => {
      const db = new DatabaseManager();
      db.client = mockSupabaseClient as unknown as SupabaseClient;

      const leaderboard = await db.getTop20Leaderboard();
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].username).toBe('Champion');
      expect(leaderboard[0].wave_reached).toBe(50);
    });
  });
});
