const clickSound = new Audio('sound/buttonClick.m4a');
//clickSound.volume = 0.5;

document.addEventListener('click', (e) => {
  if (e.target.matches('button, a, [role="button"], .btn')) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});