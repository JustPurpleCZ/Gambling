import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onChildAdded, onChildRemoved, get, onDisconnect, set, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    databaseURL: "https://gambling-goldmine-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.firebasestorage.app",
    messagingSenderId: "159900206701",
    appId: "1:159900206701:web:01223c4665df6f7377a164"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ============ FIREBASE LOGIC ============
let uid;
let presenceRef;
const lobbyId = localStorage.getItem("dicesLobbyId");
const playersRef = ref(db, `/games/lobbies/dices/${lobbyId}/players`);
const lobbyRef = ref(db, `/games/lobbies/dices/${lobbyId}`);
const isHost = JSON.parse(localStorage.getItem("dicesIsHost"));
let gameStarted = false;
const activeGameRef = ref(db, `/games/active/dices/${lobbyId}`);
let lobbyInfo;
let playerOrder;
let activePresenceRef;
const activePlayersRef = ref(db, `/games/active/dices/${lobbyId}/players`);

// ============ DOM ELEMENTS ============
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cup = document.getElementById('cup');
const gameContainer = document.getElementById('game-container');
const nameP = document.getElementById("lobbyName");
const playerList = document.getElementById("playerList");
const playerCountPar = document.getElementById("playerCountPar");
const startBtn = document.getElementById("startBtn");
const activePlayerList = document.getElementById("activePlayerList");
const turnIndicator = document.getElementById("turnIndicator");
const turnScorePar = document.getElementById("turnScorePar");
const endTurnBtn = document.getElementById("endTurnBtn");
const errorMessage = document.getElementById("errMessage");

// ============ GAME STATE ============
let dice = [];
let lockedDice = [];
let isDraggingCup = false;
let cupXPercent = 20; 
let cupYPercent = 20; 
let mouseX = 0;
let mouseY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let shakeIntensity = 0;
let cupVelocityX = 0;
let cupVelocityY = 0;
let cupState = 'normal';
let isRolling = false;
let isMyTurn = false;
let canRoll = true;
let rollCount = 0;

// Images
const cupImg = 'main/dice/cup.png';
const cupSpillImg = 'main/dice/cup_spillF.gif';
const diceImages = [];
for (let i = 1; i <= 6; i++) {
  diceImages.push(`main/dice/dice_${i}.png`);
}

cup.style.backgroundImage = `url(${cupImg})`;

// ============ CANVAS UTILITIES ============
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();

function vhToPx(percent) {
  return (percent * canvas.height) / 100;
}

function vwToPx(percent) {
  return (percent * canvas.width) / 100;
}

function pxToVw(px) {
  return (px / canvas.width) * 100;
}

function pxToVh(px) {
  return (px / canvas.height) * 100;
}

function renderDiePosition(die) {
    if (!die.element) return;
    const pixelX = canvas.offsetLeft + vwToPx(die.xPercent);
    const pixelY = canvas.offsetTop + vhToPx(die.yPercent);
    die.element.style.left = pixelX + 'px';
    die.element.style.top = pixelY + 'px';
    die.element.style.transform = `rotate(${die.rotation}deg)`;
}

function getRelativeMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function updateCupPosition() {
    const xPx = canvas.offsetLeft + vwToPx(cupXPercent);
    const yPx = canvas.offsetTop + vhToPx(cupYPercent);
    cup.style.left = xPx + 'px';
    cup.style.top = yPx + 'px';
}
updateCupPosition();

// ============ AUDIO ============
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playShakeSound() {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = 100 + Math.random() * 50;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.1);
}

// ============ CUP CONTROLS ============
cup.addEventListener('mousedown', (e) => {
  if (isRolling || !isMyTurn || !canRoll) return;
  
  isDraggingCup = true;
  cup.classList.add('dragging');
  cupState = 'normal';
  cup.style.backgroundImage = `url(${cupImg})`;
  cup.style.transform = 'scale(1.1) rotate(0deg)';
  
  const rect = cup.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingCup) return;
  
  const containerRect = gameContainer.getBoundingClientRect();
  const targetScreenX = e.clientX - mouseX;
  const targetScreenY = e.clientY - mouseY;
  const canvasRect = canvas.getBoundingClientRect();
  const relX = targetScreenX - canvasRect.left;
  const relY = targetScreenY - canvasRect.top;
  
  cupXPercent = pxToVw(relX);
  cupYPercent = pxToVh(relY);
  updateCupPosition();
  
  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  const speed = Math.sqrt(dx*dx + dy*dy);
  cupVelocityX = dx * 0.5;
  cupVelocityY = dy * 0.5;
  
  if (speed > 10) {
    shakeIntensity += speed;
    if (shakeIntensity > 50) {
      playShakeSound();
      shakeIntensity = 0;
    }
  } else {
    shakeIntensity *= 0.8;
  }
  
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
  
  collectDice();
});

document.addEventListener('mouseup', () => {
  if (!isDraggingCup) return;
  isDraggingCup = false;
  cup.classList.remove('dragging');
  
  // If all dice collected and we release = trigger roll
  if (dice.length === 0 && cupState === 'normal' && isMyTurn && canRoll) {
    rollDiceFromServer();
  }
});

// ============ DICE LOGIC ============
function spillDice(diceValues) {
  if (!diceValues || diceValues.length === 0) return;
  
  cupState = 'spilling';
  cup.style.backgroundImage = `url(${cupSpillImg})`;
  const angleRad = Math.atan2(cupVelocityY, cupVelocityX);
  let angleDeg = angleRad * (180 / Math.PI);
  cup.style.transform = `rotate(${angleDeg+90}deg) scale(1.1)`;
  
  const numDice = diceValues.length;
  const launchSpeedMultiplier = 4;
  const baseVx = cupVelocityX !== 0 ? cupVelocityX * launchSpeedMultiplier : 5;
  const baseVy = cupVelocityY !== 0 ? cupVelocityY * launchSpeedMultiplier : 0;
  
  for (let i = 0; i < numDice; i++) {
    const spread = (Math.random() - 0.5) * 50;
    
    dice.push({
      xPercent: cupXPercent + 5, 
      yPercent: cupYPercent + 30, 
      vx: baseVx + spread,
      vy: baseVy + spread,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      face: diceValues[i],
      finalFace: diceValues[i],
      rolling: true,
      rollTime: 0,
      element: null,
      index: i
    });
  }
  
  dice.forEach(die => {
    const el = document.createElement('div');
    el.className = 'die rolling';
    el.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
    gameContainer.appendChild(el); 
    die.element = el;
    renderDiePosition(die);
    
    die.clickHandler = () => lockDie(die);
    el.addEventListener('click', die.clickHandler);
  });
  
  isRolling = true;
  cupVelocityX = 0;
  cupVelocityY = 0;
}

function collectDice() {
  const cupSize = vhToPx(20);
  const diceSize = vhToPx(8);
  const cupCenterX = vwToPx(cupXPercent) + cupSize * 1.2;
  const cupCenterY = vhToPx(cupYPercent) + cupSize * 2.45;
  const collectRadius = vhToPx(10);
  
  for (let i = dice.length - 1; i >= 0; i--) {
    const die = dice[i];
    if (die.rolling) continue;
    
    const diePxX = vwToPx(die.xPercent);
    const diePxY = vhToPx(die.yPercent);
    const dx = diePxX + diceSize * 2 - cupCenterX;
    const dy = diePxY + diceSize * 2 - cupCenterY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < collectRadius) {
      if (die.element) die.element.remove();
      dice.splice(i, 1);
    }
  }
}

function lockDie(die) {
  if (die.rolling || !isMyTurn) return;
  const index = dice.indexOf(die);
  if (index === -1) return;
  
  dice.splice(index, 1);
  die.element.classList.add('locked');
  die.locked = true;
  
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  const targetX = (containerW * 0.06) + (lockedDice.length % 3) * (containerW * 0.05);
  const targetY = (containerH * 0.85) + Math.floor(lockedDice.length / 3) * (containerH * 0.06);
  
  animateToPosition(die.element, targetX, targetY, () => {
    const overlay = document.createElement('div');
    overlay.className = 'locked-overlay';
    die.element.appendChild(overlay);
    die.element.style.pointerEvents = 'auto';
    die.element.style.cursor = 'pointer';
  });
  
  die.element.removeEventListener('click', die.clickHandler);
  die.clickHandler = () => unlockDie(die);
  die.element.addEventListener('click', die.clickHandler);
  
  lockedDice.push(die);
  
  // Update held dice in database
  updateHeldDiceInDB();
}

function unlockDie(die) {
  if (!die.locked || !isMyTurn) return;
  const index = lockedDice.indexOf(die);
  if (index === -1) return;
  
  lockedDice.splice(index, 1);
  die.locked = false;
  
  const overlay = die.element.querySelector('.locked-overlay');
  if (overlay) overlay.remove();
  die.element.classList.remove('locked');
  
  const randomXPercent = Math.random() * 80 + 10;
  const randomYPercent = Math.random() * 80 + 10;
  die.vx = 0;
  die.vy = 0;
  die.rolling = false;
  
  const targetX = canvas.offsetLeft + vwToPx(randomXPercent);
  const targetY = canvas.offsetTop + vhToPx(randomYPercent);
  
  animateToPosition(die.element, targetX, targetY, () => {
    die.xPercent = randomXPercent;
    die.yPercent = randomYPercent;
    die.element.removeEventListener('click', die.clickHandler);
    die.clickHandler = () => lockDie(die);
    die.element.addEventListener('click', die.clickHandler);
    die.element.style.cursor = 'pointer';
  });
  
  dice.push(die);
  repositionLockedDice();
  
  // Update held dice in database
  updateHeldDiceInDB();
}

function animateToPosition(element, targetX, targetY, callback) {
  const startX = parseFloat(element.style.left);
  const startY = parseFloat(element.style.top);
  const duration = 500;
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentX = startX + (targetX - startX) * eased;
    const currentY = startY + (targetY - startY) * eased;
    element.style.left = currentX + 'px';
    element.style.top = currentY + 'px';
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (callback) {
      callback();
    }
  }
  animate();
}

function repositionLockedDice() {
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  
  lockedDice.forEach((die, i) => {
    const targetX = (containerW * 0.06) + (i % 3) * (containerW * 0.05);
    const targetY = (containerH * 0.85) + Math.floor(i / 3) * (containerH * 0.06);
    if(die.element) {
        die.element.style.left = targetX + 'px';
        die.element.style.top = targetY + 'px';
    }
  });
}

function clearAllDice() {
  dice.forEach(die => {
    if (die.element) die.element.remove();
  });
  lockedDice.forEach(die => {
    if (die.element) die.element.remove();
  });
  dice = [];
  lockedDice = [];
}

// ============ PHYSICS UPDATE ============
function update() {
  let allStopped = true;
  const diceSize = vhToPx(16);
  
  dice.forEach(die => {
    if (die.rolling) {
      die.rollTime += 16;
      let diePxX = vwToPx(die.xPercent);
      let diePxY = vhToPx(die.yPercent);
      
      diePxX += die.vx;
      diePxY += die.vy;
      die.vx *= 0.92;
      die.vy *= 0.92;
      
      if (diePxX > canvas.width - diceSize) {
        diePxX = canvas.width - diceSize;
        die.vx *= -0.6;
      }
      if (diePxX < 0) {
        diePxX = 0;
        die.vx *= -0.6;
      }
      if (diePxY > canvas.height - diceSize) {
        diePxY = canvas.height - diceSize;
        die.vy *= -0.6;
        die.vx *= 0.9;
      }
      if (diePxY < 0) {
         diePxY = 0;
         die.vy *= -0.6;
      }
      
      die.xPercent = pxToVw(diePxX);
      die.yPercent = pxToVh(diePxY);
      
      dice.forEach(other => {
        if (die === other) return;
        const otherPxX = vwToPx(other.xPercent);
        const otherPxY = vhToPx(other.yPercent);
        const dx = otherPxX - diePxX;
        const dy = otherPxY - diePxY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < diceSize && dist > 0) {
           const nx = dx/dist; const ny = dy/dist;
           const overlap = diceSize - dist;
           diePxX -= nx * overlap * 0.5;
           diePxY -= ny * overlap * 0.5;
           other.xPercent = pxToVw(vwToPx(other.xPercent) + nx*overlap*0.5);
           other.yPercent = pxToVh(vhToPx(other.yPercent) + ny*overlap*0.5);
           die.xPercent = pxToVw(diePxX);
           die.yPercent = pxToVh(diePxY);
           const relVx = die.vx - other.vx; const relVy = die.vy - other.vy;
           const impulse = (relVx*nx + relVy*ny);
           die.vx -= impulse*nx; die.vy -= impulse*ny;
           other.vx += impulse*nx; other.vy += impulse*ny;
        }
      });
      
      die.rotation += die.rotationSpeed;
      die.rotationSpeed *= 0.98;
      
      if (Math.random() < 0.1) {
        die.face = Math.floor(Math.random() * 6) + 1;
        if (die.element) die.element.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
      }
      
      const speed = Math.sqrt(die.vx*die.vx + die.vy*die.vy);
      if (speed < 0.1 && die.rollTime > 1000) {
        die.rolling = false;
        die.vx = 0; die.vy = 0; die.rotationSpeed = 0;
        die.face = die.finalFace;
        if (die.element) {
          die.element.classList.remove('rolling');
          die.element.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
        }
      } else {
        allStopped = false;
      }
      
      renderDiePosition(die);
    }
  });
  
  if (allStopped && isRolling) {
    isRolling = false;
  }
  
  requestAnimationFrame(update);
}

update();

// ============ RESIZE HANDLER ============
window.addEventListener('resize', () => {
  resizeCanvas();
  updateCupPosition();
  dice.forEach(die => renderDiePosition(die));
  repositionLockedDice();
});

// ============ FIREBASE FUNCTIONS ============
async function checkAuth() {
    const user = await new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, (u) => {
            unsub();
            resolve(u);
        });
    });

    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    uid = user.uid;
}

async function getLobbyInfo() {
    try {
        const snapshot = await get(lobbyRef);
        if (snapshot.exists()) {
            lobbyInfo = snapshot.val();
            nameP.textContent = lobbyInfo.name || lobbyId;
            return;
        }
    } catch (err) {
        console.error(err);
    }
}

async function updatePlayerList() {
    const snapshot = await get(playersRef);
    if (snapshot.exists()) {
        const players = snapshot.val();
        let playerCount = 0;
        playerList.replaceChildren();

        Object.values(players).forEach(player => {
            playerCount++;
            const playerDiv = document.createElement("div");
            const name = document.createElement("p");
            playerList.appendChild(playerDiv);
            playerDiv.appendChild(name);
            name.textContent = player.username;
        });

        playerCountPar.textContent = playerCount + "/" + lobbyInfo.maxPlayers;
    }
}

async function leaveLobby() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://dices-leave-gtw5ppnvta-ey.a.run.app", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "lobbyId": lobbyId })
    });

    const response = await res.json();
    if (response.success) {
        onDisconnect(presenceRef).cancel();
        localStorage.removeItem("dicesLobbyId");
        localStorage.removeItem("dicesIsHost");
        window.location.href = "dices-hub.html";
    }
}

async function startGame() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_start", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "lobbyId": lobbyId })
    });

    const response = await res.json();
    if (response.success) {
        set(presenceRef, true);
        onDisconnect(presenceRef).cancel();
    }
}

async function rollDiceFromServer() {
    const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rollCount`));
    rollCount = snap.val();

    if (rollCount >= 3) {
        showError("Maximum rolls reached!");
        return;
    }

    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_roll", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "lobbyId": lobbyId })
    });

    const response = await res.json();
    if (response.success) {
        errorMessage.classList.remove('active');
        canRoll = false;
    } else {
        showError(response.reply);
    }
}

async function submitMove() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_move", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "lobbyId": lobbyId,
            "move": "skip"
        })
    });

    const response = await res.json();
    if (response.success) {
        errorMessage.classList.remove('active');
        clearAllDice();
    } else {
        showError(response.reply);
    }
}

async function updateHeldDiceInDB() {
    const heldArray = [];
    const allDiceCount = dice.length + lockedDice.length;
    
    for (let i = 0; i < allDiceCount; i++) {
        const isLocked = lockedDice.some(d => d.index === i);
        heldArray[i] = isLocked;
    }
    
    for (let i = 0; i < heldArray.length; i++) {
        await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${i}`), heldArray[i] || false);
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
    setTimeout(() => {
        errorMessage.classList.remove('active');
    }, 3000);
}

async function updateActivePlayerList() {
    const playersInfo = await get(activePlayersRef);
    if (!playersInfo.exists()) return;
    
    let gameEnded = true;
    activePlayerList.replaceChildren();
    
    for (const player of playerOrder) {
        const playerData = playersInfo.val()[player];
        if (!playerData) continue;
        
        const activePlayerDiv = document.createElement("div");
        const name = document.createElement("p");
        const score = document.createElement("p");
        const parTurnScore = document.createElement("p");
        
        activePlayerList.appendChild(activePlayerDiv);
        activePlayerDiv.appendChild(name);
        activePlayerDiv.appendChild(score);
        activePlayerDiv.appendChild(parTurnScore);
        
        name.textContent = playerData.username;
        score.textContent = "Score: " + playerData.score;
        parTurnScore.textContent = "Turn: " + playerData.turnScore;
        
        if (playerData.playersTurn === true) {
            const theirTurn = document.createElement("p");
            theirTurn.textContent = "▶ Playing";
            theirTurn.style.color = "#FFD700";
            activePlayerDiv.appendChild(theirTurn);
            gameEnded = false;

            if (player === uid) {
                await handleMyTurn();
            } else {
                isMyTurn = false;
                cup.classList.add('disabled');
                endTurnBtn.classList.remove('active');
                turnIndicator.textContent = playerData.username + "'s turn";
            }
        }

        if (playerData.connected === false) {
            const connected = document.createElement("p");
            connected.textContent = "Disconnected";
            connected.style.color = "#ff4444";
            activePlayerDiv.appendChild(connected);
        }
    }

    if (gameEnded) {
        await handleGameEnd();
    }
}

async function handleMyTurn() {
    isMyTurn = true;
    cup.classList.remove('disabled');
    endTurnBtn.classList.add('active');
    turnIndicator.textContent = "YOUR TURN!";
    
    const turnScoreSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/turnScore`));
    turnScorePar.textContent = "Your score this turn: " + turnScoreSnap.val();
    
    const rollCountSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rollCount`));
    rollCount = rollCountSnap.val();
    
    const rolledSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
    const heldSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
    
    const rolledDice = rolledSnap.val();
    const heldDice = heldSnap.val();
    
    if (rolledDice && rolledDice.length > 0) {
        clearAllDice();
        
        // Create dice that aren't held
        const newDice = [];
        const newLockedDice = [];
        
        for (let i = 0; i < rolledDice.length; i++) {
            if (heldDice && heldDice[i]) {
                // This die is locked
                const lockedDie = {
                    face: rolledDice[i],
                    finalFace: rolledDice[i],
                    locked: true,
                    index: i,
                    element: null
                };
                
                const el = document.createElement('div');
                el.className = 'die locked';
                el.style.backgroundImage = `url(${diceImages[lockedDie.face - 1]})`;
                gameContainer.appendChild(el);
                lockedDie.element = el;
                
                const overlay = document.createElement('div');
                overlay.className = 'locked-overlay';
                el.appendChild(overlay);
                
                lockedDie.clickHandler = () => unlockDie(lockedDie);
                el.addEventListener('click', lockedDie.clickHandler);
                
                newLockedDice.push(lockedDie);
            } else {
                // This die is free
                newDice.push(rolledDice[i]);
            }
        }
        
        lockedDice = newLockedDice;
        repositionLockedDice();
        
        if (newDice.length > 0) {
            spillDice(newDice);
        }
        
        canRoll = rollCount < 3;
    } else {
        canRoll = true;
    }
}

async function handleGameEnd() {
    document.getElementById("gameEndDiv").classList.add('active');
    
    const idSnap = await get(ref(db, `/games/active/dices/${lobbyId}/winnerId`));
    const winnerId = idSnap.val();
    
    const infoSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${winnerId}`));
    const winnerInfo = infoSnap.val();
    
    const winAmountSnap = await get(ref(db, `/games/active/dices/${lobbyId}/winAmount`));
    const winAmount = winAmountSnap.val();
    
    document.getElementById("winnerName").textContent = "Winner: " + winnerInfo.username;
    document.getElementById("winnerScore").textContent = "Money won: " + winAmount;
    
    if (winnerId === uid) {
        document.getElementById("winMessage").textContent = "Good job! The money has been transferred to your wallet.";
    } else {
        document.getElementById("winMessage").textContent = "Better luck next time!";
    }
}

async function gameStart() {
    gameStarted = true;
    activePresenceRef = ref(db, `/games/active/dices/${lobbyId}/players/${uid}/connected`);
    set(activePresenceRef, true);
    onDisconnect(activePresenceRef).set(false);
    console.log("Active presence set");

    onChildRemoved(ref(db, `/games/active/dices`), (removedLobby) => {
        if (removedLobby.key === lobbyId) {
            onDisconnect(activePresenceRef).cancel();
            window.location.href = "dices-hub.html";
        }
    });

    console.log("Setting player list updates");
    onValue(ref(db, `/games/active/dices/${lobbyId}/playerOrder`), (snap) => {
        console.log("Player order directory changed: ", snap.val());
        if (snap.val() != null) {
            playerOrder = snap.val();
            document.getElementById("preStart").style.display = "none";
            document.getElementById("game-container").classList.add('active');
            
            onValue(activePlayersRef, () => {
                updateActivePlayerList();
            });
        }
    });
}

// ============ INITIALIZATION ============
(async () => {
    await checkAuth();
    await getLobbyInfo();

    const snapshot = await get(ref(db, `/games/active/dices/${lobbyId}`));
    if (snapshot.exists()) {
        gameStart();
    } else {
        presenceRef = ref(db, `/games/lobbies/dices/${lobbyId}/players/${uid}/connected`);
        set(presenceRef, true);
        onDisconnect(presenceRef).set(false);

        onChildAdded(playersRef, () => updatePlayerList());
        onChildRemoved(playersRef, () => updatePlayerList());

        onChildRemoved(ref(db, `/games/lobbies/dices`), (removedLobby) => {
            if (removedLobby.key === lobbyId && !gameStarted) {
                onDisconnect(presenceRef).cancel();
                window.location.href = "dices-hub.html";
            }
        });

        onChildAdded(ref(db, `/games/active/dices`), (addedLobby) => {
            if (addedLobby.key === lobbyId) {
                gameStarted = true;
                set(presenceRef, false);
                onDisconnect(presenceRef).cancel();
                gameStart();
            }
        });
    }
})();

// ============ EVENT LISTENERS ============
if (isHost) {
    startBtn.style.display = "block";
    startBtn.addEventListener("click", async () => {
        const snapshot = await get(playersRef);
        if (snapshot.exists()) {
            const playerCount = Object.keys(snapshot.val()).length;
            if (playerCount >= 2) {
                await startGame();
            }
        }
    });
}

document.getElementById("leaveBtn").addEventListener("click", () => {
    leaveLobby();
});

endTurnBtn.addEventListener("click", () => {
    if (isMyTurn) {
        submitMove();
    }
});

document.getElementById("exitBtn").addEventListener("click", () => {
    localStorage.removeItem("dicesLobbyId");
    localStorage.removeItem("dicesIsHost");
    window.location.href = "dices-hub.html";
});

window.addEventListener("keydown", (key) => {
    if (key.key === "l") {
        localStorage.removeItem("lobbyName");
        window.location.href = "dices-hub.html";
    }
});