import type { Vec3 } from '../../ModelKit';
import { joinedBruteSkin } from './zombieLabTools';
export type ZombieKind = 'zombie' | 'giantZombie' | 'zombieKing';
export function zombieWrists(kind: ZombieKind): Vec3[] {
  return [-1, 1].map((side) =>
    kind === 'giantZombie'
      ? [side * 1.03, 0.2765, -0.34]
      : kind === 'zombieKing'
        ? side < 0
          ? [-0.77, 1.18, -0.63]
          : [0.85, 1.3, 0.05]
        : [side * 0.86, 0.8, -0.12],
  );
}
/** Continuous deltoid/biceps, narrowed elbow and heavier forearm, with a broad anterior muscle plane. */
export function buildDetailedZombieSkin(kind: ZombieKind) {
  return joinedBruteSkin(zombieWrists(kind), kind === 'zombie' ? 17 : 34, false, false, true);
}
