const clickSound = new Audio('sound/buttonClick3.mp3');

document.addEventListener('click', (e) => {
  if (e.target.matches('button, a, [role="button"], .btn')) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});