import './style.css';
import { Game } from './core/Game';
import { preloadCreatureWorld } from './visual/CreaturePreload';

async function boot(): Promise<void> {
  await preloadCreatureWorld('school');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const game = new Game(canvas);
  game.start();
  if (import.meta.env.DEV) window.game = game;
  hideBootLoader();
}

// 부팅 로더 제거 (흰 화면 방지 — 검토의견 §2)
// 모델 준비 완료 후 제거한다. 준비 작업은 rAF가 아닌 타이머로 나누어 숨김 탭에서도 완료된다.
function hideBootLoader(): void {
  const loader = document.getElementById('boot-loader');
  if (!loader || loader.classList.contains('hide')) return;
  loader.classList.add('hide');
  setTimeout(() => loader.remove(), 450);
}
// Do not remove the loader before CPU-authored creature templates are ready.
void boot().catch((error: unknown) => {
  console.error('Game initialization failed', error);
  const loader = document.getElementById('boot-loader');
  if (loader) loader.textContent = 'Unable to initialize the game. Please reload.';
});

// 디버그/E2E 테스트용 노출 — 개발 빌드에서만 (프로덕션 치트 경로 차단)
declare global {
  interface Window {
    game?: Game;
  }
}
