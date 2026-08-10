import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TalentData } from '../types';

export interface UserProfile {
  id: string;
  username: string;
  avatarId: string;
}

/** Perfil como fica guardado no localStorage (fonte da verdade, igual estrelas/talentos). */
export interface LocalProfile {
  username: string;
  avatarId: string;
}

export interface ProfileSyncResult {
  /** Perfil efetivo a exibir, ou null se o jogador ainda nao tem nenhum. */
  profile: LocalProfile | null;
  /** false quando nao foi possivel ler o remoto (offline, sem auth ou erro de rede). */
  remoteOk: boolean;
  /** true quando o local esta a frente do remoto e aguarda envio. */
  pending: boolean;
}

export interface LeaderboardEntry {
  username: string;
  avatar_id: string;
  wave_reached: number;
  gold_earned: number;
  total_kills: number;
  map_id: string;
  challenge_mode: string;
  created_at: string;
}

export interface PendingRun {
  mapId: string;
  challengeMode: string;
  waveReached: number;
  goldEarned: number;
  totalKills: number;
}

export interface PendingSyncQueue {
  playerState?: {
    stars: number;
    talents: TalentData;
  };
  achievements?: Record<string, { progress: number; unlocked: boolean }>;
  pendingRuns?: PendingRun[];
  profile?: LocalProfile;
}

/**
 * DatabaseManager handles connection and operations with Supabase.
 * Implements a Local-First Outbox Pattern for background synchronization.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public client: SupabaseClient | null = null;
  private userId: string | null = null;
  private readonly QUEUE_KEY = 'td2d_sync_queue_v1';
  private readonly PROFILE_KEY = 'td2d_profile_v1';
  private isSyncing = false;
  private authDisabled = false;
  private syncPromise: Promise<void> | null = null;
  /** Login em voo, compartilhado por todos os chamadores concorrentes de ensureAuth(). */
  private authPromise: Promise<string | null> | null = null;
  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        '[DatabaseManager] Supabase environment variables missing. Operating in local-offline mode.'
      );
      this.client = null;
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseAnonKey);
      console.log('[DatabaseManager] Supabase client successfully initialized.');
      // Attempt silent auth in background
      this.ensureAuth().catch((err) => {
        console.warn('[DatabaseManager] Anonymous auth warning:', err);
      });
    } catch (error) {
      console.error('[DatabaseManager] Failed to initialize Supabase client:', error);
      this.client = null;
    }
  }

  public isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Garante que o usuario esta autenticado (via login anonimo silencioso se preciso).
   *
   * Chamadas concorrentes compartilham o MESMO login em voo. Sem isso, cada chamador
   * que chegasse antes de `userId` ser preenchido disparava seu proprio
   * signInAnonymously(), criando N usuarios anonimos por carregamento — e o ultimo a
   * resolver sobrescrevia a identidade, fazendo o jogador perder o perfil salvo.
   */
  public async ensureAuth(): Promise<string | null> {
    if (!this.client || this.authDisabled) return null;
    if (this.userId) return this.userId;
    if (this.authPromise) return this.authPromise;

    this.authPromise = this.performAuth().finally(() => {
      this.authPromise = null;
    });
    return this.authPromise;
  }

  private async performAuth(): Promise<string | null> {
    if (!this.client) return null;

    try {
      const { data: sessionData } = await this.client.auth.getSession();
      if (sessionData?.session?.user) {
        this.userId = sessionData.session.user.id;
        this.flushSyncQueue();
        return this.userId;
      }

      const { data, error } = await this.client.auth.signInAnonymously();
      if (error) throw error;

      if (data?.user) {
        this.userId = data.user.id;
        console.log('[DatabaseManager] Anonymous session established:', this.userId);
        this.flushSyncQueue();
        return this.userId;
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; code?: string; status?: number } | null;
      if (
        errorObj?.message?.includes('Anonymous sign-ins are disabled') ||
        errorObj?.code === 'anonymous_provider_disabled'
      ) {
        this.authDisabled = true;
        console.warn(
          '[DatabaseManager] ⚠️ Logins anônimos estão desativados no projeto Supabase.\n' +
          'Para habilitar: acesse o Supabase Dashboard -> Authentication -> Providers -> Anonymous Sign-ins e ative a opção (lembre-se de clicar em SAVE no fim da página).'
        );
      } else if (errorObj?.status === 422) {
        this.authDisabled = true;
        console.warn(
          `[DatabaseManager] ⚠️ Erro 422 ao autenticar anonimamente: ${errorObj.message || 'Unprocessable Content'}.\n` +
          'Verifique no Supabase se clicou em SAVE após ativar Anonymous Sign-ins ou se "Allow new users to sign up" está ativado em Authentication -> Settings.'
        );
      } else {
        console.warn('[DatabaseManager] Auth check failed:', err);
      }
    }
    return null;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  /** Le o perfil guardado no localStorage. */
  public loadLocalProfile(): LocalProfile | null {
    try {
      const raw = localStorage.getItem(this.PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LocalProfile>;
        if (typeof parsed?.username === 'string' && parsed.username.length > 0) {
          return {
            username: parsed.username,
            avatarId: parsed.avatarId || 'default_avatar',
          };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private saveLocalProfile(username: string, avatarId: string): void {
    try {
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify({ username, avatarId }));
    } catch {
      // Ignore
    }
  }

  /**
   * Le o perfil remoto. `ok` distingue "nao existe perfil" (ok=true, profile=null)
   * de "nao consegui ler" (ok=false), para a UI poder dar o retorno correto.
   */
  private async fetchRemoteProfile(): Promise<{ ok: boolean; profile: UserProfile | null }> {
    if (!this.client) return { ok: false, profile: null };
    const uid = await this.ensureAuth();
    if (!uid) return { ok: false, profile: null };

    try {
      // maybeSingle: zero linhas e ausencia de perfil, nao erro.
      const { data, error } = await this.client
        .from('profiles')
        .select('id, username, avatar_id')
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { ok: true, profile: null };

      return {
        ok: true,
        profile: {
          id: data.id,
          username: data.username,
          avatarId: data.avatar_id,
        },
      };
    } catch (err) {
      console.warn('[DatabaseManager] Failed to fetch profile:', err);
      return { ok: false, profile: null };
    }
  }

  /**
   * Fetches user profile from Supabase.
   */
  public async getProfile(): Promise<UserProfile | null> {
    const { profile } = await this.fetchRemoteProfile();
    return profile;
  }

  /**
   * Reconcilia local e remoto: o local vence quando existe (local-first); se nao existe,
   * adota o remoto. Divergencia com o local a frente e reenfileirada para envio —
   * mesma semantica do merge de talentos/conquistas.
   */
  public async syncProfileWithRemote(): Promise<ProfileSyncResult> {
    const local = this.loadLocalProfile();

    if (!this.client) {
      return { profile: local, remoteOk: false, pending: !!local };
    }

    const { ok, profile: remote } = await this.fetchRemoteProfile();

    if (!local) {
      if (ok && remote) {
        this.saveLocalProfile(remote.username, remote.avatarId);
        return {
          profile: { username: remote.username, avatarId: remote.avatarId },
          remoteOk: true,
          pending: false,
        };
      }
      return { profile: null, remoteOk: ok, pending: false };
    }

    const diverged =
      !ok || !remote || remote.username !== local.username || remote.avatarId !== local.avatarId;

    if (diverged) {
      this.queueProfileSync(local.username, local.avatarId);
    }

    return { profile: local, remoteOk: ok, pending: diverged };
  }

  /**
   * Salva o perfil localmente (fonte da verdade) e propaga para o Supabase.
   *
   * Colisao de nome e rejeitada sem gravar local, porque o nome nunca sera aceito.
   * Qualquer outra falha mantem o local e enfileira o envio (`pending`).
   */
  public async updateProfile(
    username: string,
    avatarId: string
  ): Promise<{ success: boolean; error?: string; pending?: boolean }> {
    const uid = this.client ? await this.ensureAuth() : null;

    if (!uid) {
      this.saveLocalProfile(username, avatarId);
      this.queueProfileSync(username, avatarId);
      return { success: true, pending: true };
    }

    const res = await this.pushProfileRemote(uid, username, avatarId);
    if (res.taken) {
      return { success: false, error: 'Este nome de usuário já está em uso.' };
    }

    this.saveLocalProfile(username, avatarId);
    if (!res.ok) {
      this.queueProfileSync(username, avatarId);
      return { success: true, pending: true };
    }
    return { success: true };
  }

  /**
   * Envia o perfil ao Supabase. Usa upsert: com `update` puro, uma linha inexistente
   * casava 0 registros SEM retornar erro, e a UI comemorava um salvamento que nao houve.
   */
  private async pushProfileRemote(
    uid: string,
    username: string,
    avatarId: string
  ): Promise<{ ok: boolean; taken?: boolean; message?: string }> {
    if (!this.client) return { ok: false };

    try {
      const { error } = await this.client.from('profiles').upsert({
        id: uid,
        username,
        avatar_id: avatarId,
      });

      if (error) {
        // 23505 = unique_violation (profiles.username e UNIQUE no schema)
        if (error.code === '23505') return { ok: false, taken: true };
        return { ok: false, message: error.message };
      }
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      return { ok: false, message };
    }
  }

  /**
   * Enqueues the profile for background sync.
   */
  public queueProfileSync(username: string, avatarId: string): void {
    const queue = this.loadQueue();
    queue.profile = { username, avatarId };
    this.saveQueue(queue);
    this.flushSyncQueue();
  }

  /**
   * Enqueues player state (stars and talents) for background sync.
   */
  public queuePlayerStateSync(stars: number, talents: TalentData): void {
    const queue = this.loadQueue();
    queue.playerState = { stars, talents: { ...talents } };
    this.saveQueue(queue);
    this.flushSyncQueue();
  }

  /**
   * Enqueues achievement progress for background sync.
   */
  public queueAchievementSync(achievementId: string, progress: number, unlocked: boolean): void {
    const queue = this.loadQueue();
    if (!queue.achievements) queue.achievements = {};
    queue.achievements[achievementId] = { progress, unlocked };
    this.saveQueue(queue);
    this.flushSyncQueue();
  }

  /**
   * Enqueues a completed run record for background sync.
   */
  public queueRunRecord(
    mapId: string,
    challengeMode: string,
    waveReached: number,
    goldEarned: number,
    totalKills: number
  ): void {
    const queue = this.loadQueue();
    if (!queue.pendingRuns) queue.pendingRuns = [];
    queue.pendingRuns.push({
      mapId,
      challengeMode,
      waveReached,
      goldEarned,
      totalKills,
    });
    this.saveQueue(queue);
    this.flushSyncQueue();
  }
  /**
   * Retorna a seed determinística diária (Daily Seed) calculada para a data UTC atual.
   */
  public getDailySeed(): number {
    const d = new Date();
    const dateStr = `${d.getUTCFullYear()}${(d.getUTCMonth() + 1).toString().padStart(2, '0')}${d.getUTCDate().toString().padStart(2, '0')}`;
    let seed = 0;
    for (let i = 0; i < dateStr.length; i++) {
      seed = (seed << 5) - seed + dateStr.charCodeAt(i);
      seed |= 0;
    }
    return Math.abs(seed) || 20260802;
  }


  /**
   * Fetches remote player state (stars & talents) from Supabase.
   */
  public async fetchRemotePlayerState(): Promise<{ stars: number; talents: TalentData } | null> {
    if (!this.client) return null;
    const uid = await this.ensureAuth();
    if (!uid) return null;

    try {
      const { data, error } = await this.client
        .from('player_state')
        .select('*')
        .eq('player_id', uid)
        .single();

      if (error) throw error;
      if (data) {
        return {
          stars: data.stars ?? 0,
          talents: {
            damageLvl: data.talent_damage_lvl ?? 0,
            goldLvl: data.talent_gold_lvl ?? 0,
            hpLvl: data.talent_hp_lvl ?? 0,
            cdLvl: data.talent_cd_lvl ?? 0,
            repairLvl: data.talent_repair_lvl ?? 0,
            critLvl: data.talent_crit_lvl ?? 0,
          },
        };
      }
    } catch (err) {
      console.warn('[DatabaseManager] Failed to fetch player state:', err);
    }
    return null;
  }

  /**
   * Fetches remote achievements from Supabase.
   */
  public async fetchRemoteAchievements(): Promise<Record<string, { progress: number; unlocked: boolean }> | null> {
    if (!this.client) return null;
    const uid = await this.ensureAuth();
    if (!uid) return null;

    try {
      const { data, error } = await this.client
        .from('player_achievements')
        .select('achievement_id, progress, unlocked_at')
        .eq('player_id', uid);

      if (error) throw error;
      if (data) {
        const result: Record<string, { progress: number; unlocked: boolean }> = {};
        for (const item of data) {
          result[item.achievement_id] = {
            progress: item.progress ?? 0,
            unlocked: item.unlocked_at !== null,
          };
        }
        return result;
      }
    } catch (err) {
      console.warn('[DatabaseManager] Failed to fetch achievements:', err);
    }
    return null;
  }

  /**
   * Fetches Top 20 Leaderboard entries from the Supabase view.
   */
  public async getTop20Leaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from('top_20_leaderboard')
        .select('*');

      if (error) throw error;
      return (data as LeaderboardEntry[]) || [];
    } catch (err) {
      console.warn('[DatabaseManager] Failed to fetch leaderboard:', err);
      return [];
    }
  }

  /**
   * Processes the local outbox sync queue and sends pending items to Supabase.
   */
  public async flushSyncQueue(): Promise<void> {
    if (!this.client) return;
    if (this.isSyncing) {
      return this.syncPromise || Promise.resolve();
    }

    this.isSyncing = true;
    this.syncPromise = (async () => {
      try {
        const uid = await this.ensureAuth();
        if (!uid) return;

        let hasMoreToSync = true;
        while (hasMoreToSync) {
          const queue = this.loadQueue();
          let syncedProfile = false;
          let syncedPlayerState = false;
          const syncedAchievements: string[] = [];
          let syncedRunCount = 0;

          // 0. Sync Profile — antes do resto: player_state e runs referenciam profiles.id
          if (queue.profile) {
            const res = await this.pushProfileRemote(
              uid,
              queue.profile.username,
              queue.profile.avatarId
            );
            if (res.ok) {
              syncedProfile = true;
            } else if (res.taken) {
              // Nome pertence a outro jogador: descarta da fila para nao repetir para sempre.
              syncedProfile = true;
              console.warn(
                '[DatabaseManager] Profile sync descartado: nome já em uso por outro jogador.'
              );
            } else {
              console.warn('[DatabaseManager] Profile sync failed:', res.message);
            }
          }

          // 1. Sync Player State
          if (queue.playerState) {
            const { stars, talents } = queue.playerState;
            const { error } = await this.client.from('player_state').upsert({
              player_id: uid,
              stars,
              talent_damage_lvl: talents.damageLvl,
              talent_gold_lvl: talents.goldLvl,
              talent_hp_lvl: talents.hpLvl,
              talent_cd_lvl: talents.cdLvl,
              talent_repair_lvl: talents.repairLvl,
              talent_crit_lvl: talents.critLvl,
              updated_at: new Date().toISOString(),
            });

            if (!error) syncedPlayerState = true;
            else console.warn('[DatabaseManager] PlayerState sync failed:', error.message);
          }

          // 2. Sync Achievements
          if (queue.achievements && Object.keys(queue.achievements).length > 0) {
            const achievementIds = Object.keys(queue.achievements);
            for (const id of achievementIds) {
              const item = queue.achievements[id];
              const { error } = await this.client.from('player_achievements').upsert({
                player_id: uid,
                achievement_id: id,
                progress: item.progress,
                unlocked_at: item.unlocked ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              });

              if (!error) syncedAchievements.push(id);
              else console.warn('[DatabaseManager] Achievement sync failed for', id, error.message);
            }
          }

          // 3. Sync Pending Runs
          if (queue.pendingRuns && queue.pendingRuns.length > 0) {
            for (const run of queue.pendingRuns) {
              const { error } = await this.client.from('runs').insert({
                player_id: uid,
                map_id: run.mapId,
                challenge_mode: run.challengeMode,
                wave_reached: run.waveReached,
                gold_earned: run.goldEarned,
                total_kills: run.totalKills,
              });

              if (error) {
                console.warn('[DatabaseManager] Run record sync failed:', error.message);
                break;
              } else {
                syncedRunCount++;
              }
            }
          }

          const didSyncAnything =
            syncedProfile || syncedPlayerState || syncedAchievements.length > 0 || syncedRunCount > 0;
          if (didSyncAnything) {
            this.updateQueueAfterSync(
              syncedProfile,
              syncedPlayerState,
              syncedAchievements,
              syncedRunCount
            );
          }

          const recheckQueue = this.loadQueue();
          const hasRemainingItems =
            !!recheckQueue.profile ||
            !!recheckQueue.playerState ||
            !!(recheckQueue.achievements && Object.keys(recheckQueue.achievements).length > 0) ||
            !!(recheckQueue.pendingRuns && recheckQueue.pendingRuns.length > 0);

          if (!didSyncAnything || !hasRemainingItems) {
            hasMoreToSync = false;
          }
        }
      } catch (err) {
        console.warn('[DatabaseManager] Error during flushSyncQueue:', err);
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  private updateQueueAfterSync(
    syncedProfile: boolean,
    syncedPlayerState: boolean,
    syncedAchievements: string[],
    syncedRunCount: number
  ): void {
    const currentQueue = this.loadQueue();

    if (syncedProfile) {
      delete currentQueue.profile;
    }

    if (syncedPlayerState) {
      delete currentQueue.playerState;
    }

    if (syncedAchievements.length > 0 && currentQueue.achievements) {
      syncedAchievements.forEach((id) => {
        delete currentQueue.achievements![id];
      });
    }
    if (currentQueue.achievements && Object.keys(currentQueue.achievements).length === 0) {
      delete currentQueue.achievements;
    }

    if (syncedRunCount > 0 && currentQueue.pendingRuns) {
      currentQueue.pendingRuns.splice(0, syncedRunCount);
      if (currentQueue.pendingRuns.length === 0) {
        delete currentQueue.pendingRuns;
      }
    }

    this.saveQueue(currentQueue);
  }

  private loadQueue(): PendingSyncQueue {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore
    }
    return {};
  }

  private saveQueue(queue: PendingSyncQueue): void {
    try {
      const hasProfile = !!queue.profile;
      const hasPlayerState = !!queue.playerState;
      const hasAchievements = !!(queue.achievements && Object.keys(queue.achievements).length > 0);
      const hasRuns = !!(queue.pendingRuns && queue.pendingRuns.length > 0);

      if (!hasProfile && !hasPlayerState && !hasAchievements && !hasRuns) {
        localStorage.removeItem(this.QUEUE_KEY);
      } else {
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      }
    } catch {
      // Ignore
    }
  }
}
