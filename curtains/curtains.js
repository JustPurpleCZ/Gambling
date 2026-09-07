const CLOSE_GIF = '/assets/curtain-close.gif';
const OPEN_GIF = '/assets/curtain-open.gif';
const ANIMATION_DURATION = 1200; // Duration of your GIF in milliseconds

const overlay = document.getElementById('curtain-overlay');
const curtainImg = document.getElementById('curtain-img');

// 1. ON PAGE LOAD: Check if we navigated from another page
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('curtainTransition') === 'closing') {
    // Show overlay on top layer with OPENING gif
    curtainImg.src = `${OPEN_GIF}?t=${Date.now()}`;
    overlay.classList.add('curtain-visible');
    overlay.classList.remove('curtain-hidden');

    sessionStorage.removeItem('curtainTransition');

    // Hide overlay and drop z-index back down after animation finishes
    setTimeout(() => {
      overlay.classList.remove('curtain-visible');
      overlay.classList.add('curtain-hidden');
    }, ANIMATION_DURATION);
  }
});

// 2. ON LINK CLICK: Intercept navigation and play CLOSING gif
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetUrl = link.getAttribute('href');

    if (!targetUrl || targetUrl.startsWith('#') || link.target === '_blank' || link.origin !== window.location.origin) {
      return;
    }

    e.preventDefault();

    sessionStorage.setItem('curtainTransition', 'closing');

    // Bring overlay to z-index 9999 and play closing GIF
    curtainImg.src = `${CLOSE_GIF}?t=${Date.now()}`;
    overlay.classList.add('curtain-visible');
    overlay.classList.remove('curtain-hidden');

    // Navigate once closing animation finishes
    setTimeout(() => {
      window.location.href = targetUrl;
    }, ANIMATION_DURATION);
  });
});