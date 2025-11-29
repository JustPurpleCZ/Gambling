const nameP = document.getElementById("lobbyName");
if(localStorage.getItem("lobbyName")) {
    nameP.textContent = localStorage.getItem("lobbyName");
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cup = document.getElementById('cup');
const gameContainer = document.getElementById('game-container');

// --- RESIZING & COORDINATE SYSTEMS ---

// Update internal resolution to match CSS display size
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();

// Convert Percentages (0-100 relative to CANVAS) to Pixels
function vhToPx(percent) {
  return (percent * canvas.height) / 100;
}

function vwToPx(percent) {
  return (percent * canvas.width) / 100;
}

// Convert Pixels to Percentages
function pxToVw(px) {
  return (px / canvas.width) * 100;
}

function pxToVh(px) {
  return (px / canvas.height) * 100;
}

// Helper: Applies the visual position to the DOM element based on current canvas size
function renderDiePosition(die) {
    if (!die.element) return;
    
    // Calculate position: Canvas Offset + (Canvas Width * Percent)
    const pixelX = canvas.offsetLeft + vwToPx(die.xPercent);
    const pixelY = canvas.offsetTop + vhToPx(die.yPercent);
    
    die.element.style.left = pixelX + 'px';
    die.element.style.top = pixelY + 'px';
    die.element.style.transform = `rotate(${die.rotation}deg)`;
}

// Helper: Get mouse position relative to the Canvas
function getRelativeMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// --- GAME STATE ---

let dice = [];
let lockedDice = [];
let isDraggingCup = false;
// Cup state stored as raw Pixels relative to Canvas initially to prevent jumping, 
// but we will track percentages for consistency.
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


// Images
const cupImg = 'main/dice/cup.png';
const cupSpillImg = 'main/dice/cup_spillF.gif';
const diceImages = [];
for (let i = 1; i <= 6; i++) {
  diceImages.push(`main/dice/dice_${i}.png`);
}
const lockedOverlay = 'main/dice/dice_lock_1.gif';

cup.style.backgroundImage = `url(main/dice/cup.png)`;
cup.style.backgroundSize = 'contain';

// --- INITIAL POSITIONING ---

function updateCupPosition() {
    // Canvas Offset + (Percent converted to Px)
    const xPx = canvas.offsetLeft + vwToPx(cupXPercent);
    const yPx = canvas.offsetTop + vhToPx(cupYPercent);
    
    cup.style.left = xPx + 'px';
    cup.style.top = yPx + 'px';
}
updateCupPosition();

// --- AUDIO ---
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

// --- CONTROLS ---

cup.addEventListener('mousedown', (e) => {
  if (isRolling) return;
  isDraggingCup = true;
  cup.classList.add('dragging');
  cupState = 'normal';
  cup.style.backgroundImage = `url(${cupImg})`;
  cup.style.transform = 'scale(1.1) rotate(0deg)';
  // Calculate click offset within the cup element
  const rect = cup.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingCup) return;
  
  // Logic: We want to move the cup based on mouse, but store position as % of canvas
  
  // 1. Get Mouse relative to the Game Container's top-left
  // (We subtract the container's offset, though getBoundingClientRect is easier)
  const containerRect = gameContainer.getBoundingClientRect();
  
  // 2. Position of cup top-left relative to screen
  const targetScreenX = e.clientX - mouseX;
  const targetScreenY = e.clientY - mouseY;
  
  // 3. Convert that to Position relative to Canvas
  const canvasRect = canvas.getBoundingClientRect();
  const relX = targetScreenX - canvasRect.left;
  const relY = targetScreenY - canvasRect.top;
  
  // 4. Save as Percent
  cupXPercent = pxToVw(relX);
  cupYPercent = pxToVh(relY);
  
  updateCupPosition();
  
  // Velocity Calc
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
  if (dice.length === 0 && cupState === 'normal') {
    spillDice();
  }
});

// --- GAME LOGIC ---

function spillDice() {
  cupState = 'spilling';
  cup.style.backgroundImage = `url(${cupSpillImg})`;
  const angleRad = Math.atan2(cupVelocityY, cupVelocityX);
  let angleDeg = angleRad * (180 / Math.PI);

  
  // Apply the rotation to the cup element
  cup.style.transform = `rotate(${angleDeg+90}deg) scale(1.1)`;
  const numDice = 6 - lockedDice.length;
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
      face: Math.floor(Math.random() * 6) + 1,
      rolling: true,
      rollTime: 0,
      element: null
    });
  }
  
  dice.forEach(die => {
    const el = document.createElement('div');
    el.className = 'die rolling';
    el.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
    el.style.backgroundSize = 'contain';
    
    gameContainer.appendChild(el); 
    die.element = el;
    
    // Initial render
    renderDiePosition(die);
    
    die.clickHandler = () => lockDie(die);
    el.addEventListener('click', die.clickHandler);
  });
  
  isRolling = true;
  cupVelocityX = 0;
  cupVelocityY = 0;
}

function collectDice() {
  const cupSize = vhToPx(20); // Check collision in Pixels
  const diceSize = vhToPx(8);
  
  // Calculate cup center in Pixels
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

let presenceRef;

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

<<<<<<< HEAD
function lockDie(die) {
  if (die.rolling) return;
  const index = dice.indexOf(die);
  if (index === -1) return;
  
  dice.splice(index, 1);
  die.element.classList.add('locked');
  die.locked = true;
  
  // Calculate target relative to container
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
}
=======
>>>>>>> 3165d6947475b8ddeb582229a9d6f774df4528dd

const lobbyId = localStorage.getItem("dicesLobbyId");
const playersRef = ref(db, `/games/lobbies/dices/${lobbyId}/players`);
const lobbyRef = ref(db, `/games/lobbies/dices/${lobbyId}`);
let uid;

let lobbyInfo;
async function getLobbyInfo() {
    try {
        const snapshot = await get(lobbyRef);
        if (snapshot.exists()) {
            lobbyInfo = snapshot.val();
            console.log("Lobby data", lobbyInfo);
            return lobbyInfo;
        } else {
            console.log("Lobby data failed to load");
        }
    } catch (err) {
        console.error(err);
    }
<<<<<<< HEAD
  }
  animate();
}

function unlockDie(die) {
  if (!die.locked) return;
  const index = lockedDice.indexOf(die);
  if (index === -1) return;
  
  lockedDice.splice(index, 1);
  die.locked = false;
  
  const overlay = die.element.querySelector('.locked-overlay');
  if (overlay) overlay.remove();
  
  die.element.classList.remove('locked');
  
  // Unlock to a random position on the canvas
  const randomXPercent = Math.random() * 80 + 10;
  const randomYPercent = Math.random() * 80 + 10;
  
  die.vx = 0;
  die.vy = 0;
  die.rolling = false;
  
  // Calculate Target (Canvas Offset + Percent->Px)
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
}

function repositionLockedDice() {
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  
  lockedDice.forEach((die, i) => {
    const targetX = (containerW * 0.06) + (i % 3) * (containerW * 0.05);
    const targetY = (containerH * 0.85) + Math.floor(i / 3) * (containerH * 0.06);
    
    // If not animating, just set it
    if(die.element) {
        die.element.style.left = targetX + 'px';
        die.element.style.top = targetY + 'px';
    }
  });
}

function update() {
  let allStopped = true;
  const diceSize = vhToPx(16);
  
  dice.forEach(die => {
    if (die.rolling) {
      die.rollTime += 16;
      
      // 1. Convert State (%) to Physics (Px)
      let diePxX = vwToPx(die.xPercent);
      let diePxY = vhToPx(die.yPercent);
      
      // 2. Physics Math
      diePxX += die.vx;
      diePxY += die.vy;
      die.vx *= 0.92;
      die.vy *= 0.92;
      
      // 3. Walls (Canvas Boundaries)
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
      
      // 4. Update State (%) from Physics (Px)
      die.xPercent = pxToVw(diePxX);
      die.yPercent = pxToVh(diePxY);
      
      // 5. Collision (Simplified)
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
           // Bounce
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
        die.face = Math.floor(Math.random() * 6) + 1;
        if (die.element) {
          die.element.classList.remove('rolling');
          die.element.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
        }
      } else {
        allStopped = false;
      }
      
      // 6. RENDER
      renderDiePosition(die);
=======
}

const playerList = document.getElementById("playerList");
const isHost = JSON.parse(localStorage.getItem("dicesIsHost"));
let gameStarted = false;
const activeGameRef = ref(db, `/games/active/dices/${lobbyId}`);
console.log("Host: ", isHost, "LobbyId: ", lobbyId);

(async () => {
    await checkAuth();
    await getLobbyInfo();
    await checkRecovery();
    
    console.log("Setting presence for", uid);
    presenceRef = ref(db, `/games/lobbies/dices/${lobbyId}/players/${uid}/connected`);
    set(presenceRef, true);
    onDisconnect(presenceRef).set(false);

    onChildAdded(playersRef, () => {
        updatePlayerList();
    });

    onChildRemoved(playersRef, () => {
        updatePlayerList();
    });

    onChildRemoved(ref(db, `/games/lobbies/dices`), (removedLobby) => {
        if (removedLobby.key === lobbyId && !gameStarted) {
            onDisconnect(presenceRef).cancel();
            window.location.href = "dices-hub.html";
        }
    });

    onChildAdded(ref(db, `/games/active/dices`), (addedLobby) => {
        if (addedLobby.key === lobbyId) {
            gameStart();
        }
    });
})();

async function checkRecovery() {
    const snapshot = await get(presenceRef);
    if (snapshot.exists() && snapshot.val() === false) {
        console.log("Recovering connection");
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_join", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
            })
        });
        
        const response = await res.json();
        console.log("Recovery response:", response);

        if (response.success) {
            return;
        } else {
            leaveLobby();
        }
>>>>>>> 3165d6947475b8ddeb582229a9d6f774df4528dd
    }
}

let startBtn = document.getElementById("startBtn");
if (isHost) {
    startBtn.style.display = "block";

<<<<<<< HEAD
// --- RESIZE HANDLER ---
// This is the key fix for responsiveness
window.addEventListener('resize', () => {
  // 1. Update global canvas width/height variables
  resizeCanvas();
  
  // 2. Update Cup Position
  updateCupPosition();
  
  // 3. Force re-render of ALL active dice based on their % coordinates
  dice.forEach(die => {
    renderDiePosition(die);
  });
  
  // 4. Force re-render of Locked dice
  repositionLockedDice();
});

window.addEventListener("keydown", (key) => {
  if (key.key === "l") {
    localStorage.removeItem("lobbyName");
    window.location.href = "dices-hub.html";
  }
});
=======
    startBtn.addEventListener("click", () => {
        if (playerCount >= 2) {
            startGame();
        }
    })
}

const playerCountPar = document.getElementById("playerCountPar");
let playerCount;

async function updatePlayerList() {
    console.log("Updating player list");
    let players;

    get(playersRef).then((snapshot) => {
        if (snapshot.exists()) {
            players = snapshot.val();
            console.log("Player list:", players);
            playerCount = 0;

            playerList.replaceChildren();

            Object.values(players).forEach(player => {
                console.log("Adding player:", player.username);
                playerCount++;
                const playerDiv = document.createElement("div");
                const name = document.createElement("p");

                playerList.appendChild(playerDiv);
                playerDiv.appendChild(name);

                if (isHost) {
                    const kickBtn = document.createElement("button");
                    playerDiv.appendChild(kickBtn);
                    kickBtn.textContent = "kick player";

                    kickBtn.addEventListener("click", () => {
                        kick(snapshot.key);
                    });
                }

                name.textContent = player.username;
            });

            playerCountPar.textContent = playerCount + "/" + lobbyInfo.maxPlayers;
            
        } else {
            console.log("Not found");
        }
    }).catch(console.error);
}

async function kick(kickPlayer) {
    /*
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://dices-kick-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
                "user": kickPlayer
            })
    });

    const response = await res.json();
    console.log(response);

    */
   console.log("Kicking disabled");
}

async function leaveLobby() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://dices-leave-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
            })
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        onDisconnect(presenceRef).cancel();
        localStorage.removeItem("dicesLobbyId", "dicesIsHost");
        window.location.href = "dices-hub.html";
    } else {
        console.log("Failed to leave:", response.reply);
    }
}

document.getElementById("leaveBtn").addEventListener("click", () => {
    leaveLobby();
})

async function startGame() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_start", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
            })
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        onDisconnect(presenceRef).cancel();
    } else {
        console.log("Failed to start game:", response.reply);
    }
}

//Game start
let activePresenceRef;
let playerOrder;

const activePlayerList = document.getElementById("activePlayerList");
const activePlayersRef = ref(db, `/games/active/dices/${lobbyId}/players`);

async function gameStart() {
    console.log("Game is starting");
    gameStarted = true;
    onDisconnect(presenceRef).cancel();
    onDisconnect(activePresenceRef).set(false);

    activePresenceRef = ref(db, `/games/active/dices/${lobbyId}/players/${uid}/connected`);
    const snap = await get(ref(db, `/games/active/dices/${lobbyId}/playerOrder`));
    playerOrder = snap.val();

    document.getElementById("preStart").style.display = "none";
    updateActivePlayerList();
    activePlayerList.style.display = "block";

    onValue(activePlayersRef, () => {
        updateActivePlayerList();
    });

    document.getElementById("moveBtn").addEventListener("click", () => {
        submitMove();
    })
}

async function updateActivePlayerList() {
    console.log("Updating player list");
    const playersInfo = await get(activePlayersRef);
     for (const player of playerOrder) {
        activePlayerList.replaceChildren();
        const activePlayerDiv = document.createElement("div");
        const name = document.createElement("p");
        const score = document.createElement("p");
        const theirTurn = document.createElement("p");

        activePlayerList.appendChild(activePlayerDiv);
        activePlayerDiv.appendChild(name);
        activePlayerDiv.appendChild(score);
        activePlayerDiv.appendChild(theirTurn);

        name.textContent = playersInfo.val()[player].username;
        score.textContent = playersInfo.val()[player].score;
        theirTurn.textContent = playersInfo.val()[player].playersTurn;
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
    console.log(response);
}
>>>>>>> 3165d6947475b8ddeb582229a9d6f774df4528dd
