import type { PlayerRole } from './types';

/**
 * Visual likeness is deliberately independent from the authoritative player identity.
 * The original auction player id/name/stats never change; this resolver only chooses
 * which existing likeness asset should render that player in the 3D presentation.
 */
const ORIGINAL_PLAYER_VISUAL_OVERRIDES: Record<string, string> = {
  // Add explicit authoritative-player-id overrides here when a specific player
  // needs a fixed likeness. Leave empty to use deterministic role-based assignment.
};

const ROLE_PROFILES: Record<string, string[]> = {
  BATTER: ['ajay-07', 'gokul-11'],
  BOWLER: ['akshay-18', 'hemanth-naidu-27'],
  KEEPER: ['hkt-17'],
  FIELDER: ['ajay-07', 'akshay-18', 'gokul-11', 'hemanth-naidu-27', 'hkt-17'],
};

const stableHash = (value: string): number => {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const normalise = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export function resolveVisualProfile(
  playerId: string,
  role?: PlayerRole | string,
  specialism?: string,
): string | undefined {
  const explicit = ORIGINAL_PLAYER_VISUAL_OVERRIDES[playerId];
  if (explicit) return explicit;

  const roleText = normalise(role);
  const specialismText = normalise(specialism);
  const key = `${playerId}|${roleText}|${specialismText}`;

  if (roleText.includes('KEEP') || roleText.includes('WICKET') || specialismText.includes('KEEP')) {
    return 'hkt-17';
  }

  if (
    roleText.includes('BOWL') ||
    specialismText.includes('BOWL') ||
    specialismText.includes('FAST') ||
    specialismText.includes('SWING') ||
    specialismText.includes('SPIN')
  ) {
    const pool = ROLE_PROFILES.BOWLER;
    return pool[stableHash(key) % pool.length];
  }

  if (roleText.includes('BAT') || specialismText.includes('BAT') || specialismText.includes('ALL')) {
    const pool = ROLE_PROFILES.BATTER;
    return pool[stableHash(key) % pool.length];
  }

  const pool = ROLE_PROFILES.FIELDER;
  return pool[stableHash(key) % pool.length];
}
