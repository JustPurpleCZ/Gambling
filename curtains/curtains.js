// Adjust these relative paths to match your exact curtain folder structure
const CLOSE_GIF = 'curtains/curtain-close.gif'; 
const OPEN_GIF = 'curtains/curtain-open.gif';   
const ANIMATION_DURATION = 1200; // Duration of GIF in ms

const overlay = document.getElementById('curtain-overlay');
const curtainImg = document.getElementById('curtain-img');

// 1. ON PAGE LOAD: Check if we navigated from another page
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('curtainTransition') === 'closing') {
    // Play opening GIF
    curtainImg.src = `${OPEN_GIF}?t=${Date.now()}`;
    overlay.classList.add('curtain-visible');
    overlay.classList.remove('curtain-hidden');

    sessionStorage.removeItem('curtainTransition');

    setTimeout(() => {
      overlay.classList.remove('curtain-visible');
      overlay.classList.add('curtain-hidden');
    }, ANIMATION_DURATION);
  }
});

// Helper function to trigger transition manually or via event
window.triggerCurtainTransition = function(targetUrl) {
  sessionStorage.setItem('curtainTransition', 'closing');
  curtainImg.src = `${CLOSE_GIF}?t=${Date.now()}`;
  overlay.classList.add('curtain-visible');
  overlay.classList.remove('curtain-hidden');

  setTimeout(() => {
    window.location.href = targetUrl;
  }, ANIMATION_DURATION);
};

// 2. GLOBAL CLICK INTERCEPTOR (Handles <a> tags, buttons, and destination cards)
document.addEventListener('click', (e) => {
  // Check for standard <a> tags or elements with data-href / onclick navigation
  const clickable = e.target.closest('a, [data-href], .destinations-row > div');
  if (!clickable) return;

  let targetUrl = clickable.getAttribute('href') || clickable.getAttribute('data-href');

  // Ignore disabled/unavailable destinations or anchor links
  if (clickable.classList.contains('unavailable') || !targetUrl || targetUrl.startsWith('#')) {
    return;
  }

  e.preventDefault();
  window.triggerCurtainTransition(targetUrl);
});