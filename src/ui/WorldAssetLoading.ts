const ID = 'world-asset-loading';
export function hideWorldAssetLoading(): void {
  document.getElementById(ID)?.remove();
}
export function showWorldAssetLoading(cancel: () => void, retry?: () => void): void {
  hideWorldAssetLoading();
  const overlay = document.createElement('div');
  overlay.id = ID;
  overlay.setAttribute('role', retry ? 'alertdialog' : 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-busy', String(!retry));
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '10000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    background: 'rgba(10,15,24,.96)',
    color: '#fff',
    padding: '24px',
    textAlign: 'center',
  });
  const title = document.createElement('p');
  title.textContent = retry
    ? '월드 데이터를 불러오지 못했습니다. / Unable to load this world.'
    : '월드 준비 중… / Loading world…';
  overlay.append(title);
  for (const [label, action] of [
    ...(retry ? [['다시 시도 / Retry', retry] as const] : []),
    ['취소 / Cancel', cancel] as const,
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = action;
    Object.assign(button.style, { padding: '12px 24px', minHeight: '44px', cursor: 'pointer' });
    overlay.append(button);
  }
  overlay.onkeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(overlay.querySelectorAll('button'));
    event.preventDefault();
    const current = Math.max(0, buttons.indexOf(event.target as HTMLButtonElement));
    buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
  };
  document.body.append(overlay);
  overlay.querySelector('button')?.focus();
}
