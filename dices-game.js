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
            return;
        } else {
            console.log("Lobby data failed to load");
        }
    } catch (err) {
        console.error(err);
    }
}

const playerList = document.getElementById("playerList");
const isHost = JSON.parse(localStorage.getItem("dicesIsHost"));
let gameStarted = false;
const activeGameRef = ref(db, `/games/active/dices/${lobbyId}`);
console.log("Host: ", isHost, "LobbyId: ", lobbyId);

(async () => {
    await checkAuth();
    await getLobbyInfo();

    const snapshot = await get(ref(db, `/games/active/dices/${lobbyId}`), );
    if (snapshot.exists()) {
      console.log("Game already active, skipping lobby");
      gameStart();
    } else {

    presenceRef = ref(db, `/games/lobbies/dices/${lobbyId}/players/${uid}/connected`);
    
    console.log("Setting presence for", uid);
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
            gameStarted = true;
            set(presenceRef, false);
            onDisconnect(presenceRef).cancel();
            gameStart();
        }
    });
  }
})();

let startBtn = document.getElementById("startBtn");
if (isHost) {
    startBtn.style.display = "block";

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
                        kick(player);
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
        localStorage.removeItem("dicesLobbyId");
        localStorage.removeItem("dicesIsHost");
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

    if (!response.success) {
        console.log("Failed to start game:", response.reply);
    }
}

//Game start
let activePresenceRef;
let playerOrder;

const errorMessage = document.getElementById("errMessage");
const activePlayerList = document.getElementById("activePlayerList");
const activePlayersRef = ref(db, `/games/active/dices/${lobbyId}/players`);

async function gameStart() {
    console.log("Game is starting");
    gameStarted = true;

    activePresenceRef = ref(db, `/games/active/dices/${lobbyId}/players/${uid}/connected`);

    console.log("Setting new presence:", uid);
    set(activePresenceRef, true);
    onDisconnect(activePresenceRef).set(false);

    onChildRemoved(ref(db, `/games/active/dices`), (removedLobby) => {
        if (removedLobby.key === lobbyId) {
            onDisconnect(activePresenceRef).cancel();
            window.location.href = "dices-hub.html";
        }
    });

    onValue(ref(db, `/games/active/dices/${lobbyId}/playerOrder`), (snap) => {
        if (snap.val() != null) {
          playerOrder = snap.val()

          document.getElementById("preStart").style.display = "none";
          updateActivePlayerList();
          document.getElementById("gameDiv").style.display = "block";

          onValue(activePlayersRef, (snapshot) => {
            updateActivePlayerList();
          });

          // Set up end turn button
          const endTurnBtn = document.querySelector(".end-turn-button");
          if (endTurnBtn) {
            endTurnBtn.addEventListener("click", () => {
              submitMove();
            });
          }
        }
    });
}

async function updateActivePlayerList() {
    const playersInfo = await get(activePlayersRef);
    console.log("Updating active player list");
    let gameEnded = false;

    const gameEndSnap = await get(ref(db, `/games/active/dices/${lobbyId}/gameEnded`));
    if (gameEndSnap.exists() && gameEndSnap.val()) {
        console.log("Game has ended");
        gameEnded = true;
    }

    activePlayerList.replaceChildren();
    let isMyTurnThisUpdate = false;
    let currentPlayerData = null;

    for (const player of playerOrder) {
        const playerData = playersInfo.val()[player];
        
        // Check if this is the current player
        if (playerData.playersTurn === true) {
          currentPlayerData = {
            uid: player,
            ...playerData
          };
          
          if (player === uid && !gameEnded) {
            isMyTurnThisUpdate = true;
          }
        }
        
        // Create player div for left sidebar (will be hidden if current player)
        const activePlayerDiv = document.createElement("div");
        if (playerData.playersTurn === true) {
          activePlayerDiv.classList.add("is-current-player");
        }
        
        const name = document.createElement("p");
        const score = document.createElement("p");
        
        activePlayerList.appendChild(activePlayerDiv);
        activePlayerDiv.appendChild(name);
        activePlayerDiv.appendChild(score);
        
        name.textContent = playerData.username;
        score.textContent = "Score: " + playerData.score;

        if (playerData.connected === false) {
          const connected = document.createElement("p");
          activePlayerDiv.appendChild(connected);
          connected.textContent = "Disconnected";
          connected.style.color = "#ff6b6b";
        }
    }

    // Update current player display at top
    if (currentPlayerData) {
      updateCurrentPlayerDisplay(currentPlayerData);
    }

    // Update bottom control panel
    if (isMyTurnThisUpdate) {
      updateBottomControlPanel();
    } else {
      // Hide control panel if not my turn
      const controlPanel = document.querySelector(".bottom-control-panel");
      if (controlPanel) {
        controlPanel.style.display = "none";
      }
    }

    // Handle game end
    if (gameEnded) {
        document.getElementById("gameEndDiv").style.display = "block";

        const idSnap = await get(ref(db, `/games/active/dices/${lobbyId}/winnerId`));
        const winnerId = idSnap.val();

        const infoSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${winnerId}`));
        const winnerInfo = infoSnap.val();

        const winAmountSnap = await get(ref(db, `/games/active/dices/${lobbyId}/winAmount`));
        const winAmount = winAmountSnap.val();

        document.getElementById("winnerName").textContent = "Winner: " + winnerInfo["username"];
        document.getElementById("winnerScore").textContent = "Money won: " + winAmount;

        if (winnerId == uid) {
            document.getElementById("winMessage").textContent = "Good job! The money minus a small fee has been added transfered to your wallet.";
        } else {
            document.getElementById("winMessage").textContent = "Too bad, try not to lose your money next time!";
        }

        document.getElementById("exitBtn").addEventListener("click", () => {
            localStorage.removeItem("dicesLobbyId");
            localStorage.removeItem("dicesIsHost");
            localStorage.removeItem("selfUID");
            window.location.href = "dices-hub.html";
        })
    }
    
    if (wasMyTurnLastUpdate && !isMyTurnThisUpdate) {
        console.log("My turn just ended. Waiting before collecting all dice.");
        setTimeout(() => {
            collectAllDiceIntoCup();
        }, 2000);
    }

    wasMyTurnLastUpdate = isMyTurnThisUpdate;
}

function updateCurrentPlayerDisplay(playerData) {
  let displayDiv = document.querySelector(".current-player-display");
  
  if (!displayDiv) {
    displayDiv = document.createElement("div");
    displayDiv.className = "current-player-display";
    document.getElementById("game-container").appendChild(displayDiv);
  }
  
  displayDiv.innerHTML = `
    <div class="current-player-pfp"></div>
    <div class="current-player-info">
      <div class="current-player-name">${playerData.username}</div>
      <div class="current-player-score">Score: ${playerData.score} | Turn: ${playerData.turnScore || 0}</div>
    </div>
    <div class="current-player-dice"></div>
  `;
  
  // Add dice to display
  const diceContainer = displayDiv.querySelector(".current-player-dice");
  if (playerData.rolledDice && playerData.rolledDice.length > 0) {
    playerData.rolledDice.forEach((dieValue, index) => {
      const dieDiv = document.createElement("div");
      dieDiv.className = "current-player-dice-item";
      dieDiv.style.backgroundImage = `url(main/dice/dice_${dieValue}.png)`;
      
      // Add visual indicator if held
      if (playerData.heldDice && playerData.heldDice[index]) {
        dieDiv.style.border = "2px solid #d4af37";
        dieDiv.style.boxShadow = "0 0 10px #d4af37";
      }
      
      diceContainer.appendChild(dieDiv);
    });
  }
}

async function updateBottomControlPanel() {
  let controlPanel = document.querySelector(".bottom-control-panel");
  
  if (!controlPanel) {
    controlPanel = document.createElement("div");
    controlPanel.className = "bottom-control-panel";
    document.getElementById("game-container").appendChild(controlPanel);
    
    controlPanel.innerHTML = `
      <div class="end-turn-button">
        <img src="main/menu/optionbox1.png" alt="End Turn">
        <div class="end-turn-text">End Turn</div>
      </div>
      <div class="score-display">
        <div class="score-label">Your Turn Score</div>
        <div class="score-value">0</div>
      </div>
    `;
    
    // Add click handler
    controlPanel.querySelector(".end-turn-button").addEventListener("click", () => {
      submitMove();
    });
  }
  
  controlPanel.style.display = "flex";
  
  // Update turn score
  const turnScoreSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/turnScore`));
  const turnScore = turnScoreSnap.val() || 0;
  
  const scoreValue = controlPanel.querySelector(".score-value");
  if (scoreValue) {
    scoreValue.textContent = turnScore;
  }
  
  // Handle rolled dice for clicking
  const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
  const snapshot = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
  
  const rolledDice = snap.val();
  const heldDice = snapshot.val();
  
  console.log("Rolls:", rolledDice, heldDice);
  
  // Store for die clicking
  window.currentRolledDice = rolledDice;
  window.currentHeldDice = heldDice;
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
    console.log("Move response:", response);

    if (response.success) {
        if (errorMessage) {
            errorMessage.style.display = "none";
        }
        collectAllDiceIntoCup();
    } else {
        if (errorMessage) {
            errorMessage.style.display = "block";
            errorMessage.textContent = response.reply;
        }
    }
}

const nameP = document.getElementById("lobbyName");
if(localStorage.getItem("lobbyName")) {
    nameP.textContent = localStorage.getItem("lobbyName");
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cup = document.getElementById('cup');
const gameContainer = document.getElementById('game-container');

// --- RESIZING & COORDINATE SYSTEMS ---

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

// --- GAME STATE ---

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
let pendingRollValues = null;
let cupCanCollect = true;
let wasMyTurnLastUpdate = false;

const cupImg = 'main/dice/cup.png';
const cupSpillImg = 'main/dice/cup_spillF.gif';
const diceImages = [];
for (let i = 1; i <= 6; i++) {
  diceImages.push(`main/dice/dice_${i}.png`);
}
const lockedOverlay = 'main/dice/dice_lock_1.gif';

cup.style.backgroundImage = `url(main/dice/cup.png)`;
cup.style.backgroundSize = 'contain';

function updateCupPosition() {
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

document.addEventListener('mouseup', async () => {
  if (!isDraggingCup) return;
  isDraggingCup = false;
  cup.classList.remove('dragging');
  
  if (dice.length === 0 && cupState === 'normal') {
    const rollSuccess = await performRoll();
    
    if (rollSuccess && pendingRollValues) {
      spillDice();
    }
  }
});

async function performRoll() {
  console.log("Performing roll via cup");
  
  try {
    const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rollCount`));
    const rollCount = snap.val();

    if (rollCount < 3) {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_roll", {
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
      console.log("Roll response:", response);

      if (response.success) {
        if (errorMessage) errorMessage.style.display = "none";
        
        const rolledSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
        pendingRollValues = rolledSnap.val();
        console.log("Dice values from server:", pendingRollValues);
        
        return true;
      } else {
        if (errorMessage) {
          errorMessage.style.display = "block";
          errorMessage.textContent = response.reply;
        }
        pendingRollValues = null;
        return false;
      }
    } else {
      if (errorMessage) {
        errorMessage.style.display = "block";
        errorMessage.textContent = "Maximum rolls reached!";
      }
      pendingRollValues = null;
      return false;
    }
  } catch (error) {
    console.error("Roll error:", error);
    if (errorMessage) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Roll failed. Please try again.";
    }
    pendingRollValues = null;
    return false;
  }
}

function spillDice() {
  cupState = 'spilling';
  cup.style.backgroundImage = `url(${cupSpillImg})`;
  cupCanCollect = false;
  const angleRad = Math.atan2(cupVelocityY, cupVelocityX);
  let angleDeg = angleRad * (180 / Math.PI);

  cup.style.transform = `rotate(${angleDeg+90}deg) scale(1.1)`;
  
  const diceValues = pendingRollValues || [];
  const numDice = diceValues.length || (6 - lockedDice.length);
  
  const launchSpeedMultiplier = 4;
  const baseVx = cupVelocityX !== 0 ? cupVelocityX * launchSpeedMultiplier : 5;
  const baseVy = cupVelocityY !== 0 ? cupVelocityY * launchSpeedMultiplier : 0;
  
  for (let i = 0; i < numDice; i++) {
    const spread = (Math.random() - 0.5) * 50;
    const faceValue = diceValues[i] || (Math.floor(Math.random() * 6) + 1);
    
    dice.push({
      xPercent: cupXPercent + 5, 
      yPercent: cupYPercent + 30, 
      vx: baseVx + spread,
      vy: baseVy + spread,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      face: faceValue,
      finalFace: faceValue,
      rolling: true,
      rollTime: 0,
      element: null,
      serverIndex: i
    });
  }
  
  dice.forEach(die => {
    const el = document.createElement('div');
    el.className = 'die rolling';
    el.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
    el.style.backgroundSize = 'contain';
    
    gameContainer.appendChild(el); 
    die.element = el;
    
    renderDiePosition(die);
    
    die.clickHandler = () => lockDie(die);
    el.addEventListener('click', die.clickHandler);
  });
  
  isRolling = true;
  cupVelocityX = 0;
  cupVelocityY = 0;
  
  pendingRollValues = null;
  
  setTimeout(() => {
    moveCupToBottomRight();
  }, 500);
}

function collectDice() {
  if (!cupCanCollect) return;
  
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

async function lockDie(die) {
  if (die.rolling) return;
  const index = dice.indexOf(die);
  if (index === -1) return;
  
  const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
  const rolledDiceValues = snap.val();
  
  if (rolledDiceValues) {
    const heldSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
    const heldDice = heldSnap.val() || [];
    
    // Use server index if available
    if (die.serverIndex !== undefined) {
      await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${die.serverIndex}`), true);
    } else {
      // Fallback to finding by face value
      for (let i = 0; i < rolledDiceValues.length; i++) {
        if (rolledDiceValues[i] === die.face && !heldDice[i]) {
          await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${i}`), true);
          break;
        }
      }
    }
  }
  
  dice.splice(index, 1);
  die.element.classList.add('locked');
  die.locked = true;
  die.rotation = 0;
  die.element.style.transform = 'rotate(0deg)';
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  const targetX = containerW * 0.032;
  const targetY = (containerH * 0.17) + (lockedDice.length * (containerH * 0.1175));
  
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

async function unlockDie(die) {
  if (!die.locked) return;
  const index = lockedDice.indexOf(die);
  if (index === -1) return;
  
  const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
  const rolledDiceValues = snap.val();
  
  if (rolledDiceValues) {
    const heldSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
    const heldDice = heldSnap.val() || [];
    
    if (die.serverIndex !== undefined) {
      await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${die.serverIndex}`), false);
    } else {
      for (let i = 0; i < rolledDiceValues.length; i++) {
        if (rolledDiceValues[i] === die.face && heldDice[i]) {
          await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${i}`), false);
          break;
        }
      }
    }
  }
  
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
}

function repositionLockedDice() {
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  
  lockedDice.forEach((die, i) => {
    const targetX = containerW * 0.032;
    const targetY = (containerH * 0.17) + (i * (containerH * 0.1175));
    
    if(die.element) {
        die.element.style.left = targetX + 'px';
        die.element.style.top = targetY + 'px';
    }
  });
}

function moveCupToBottomRight() {
  const targetXPercent = 75;
  const targetYPercent = 70;
  
  const startXPercent = cupXPercent;
  const startYPercent = cupYPercent;
  
  const duration = 800;
  const startTime = Date.now();
  
  cupState = 'normal';
  cup.style.backgroundImage = `url(${cupImg})`;
  cup.style.transform = 'scale(1) rotate(0deg)';
  
  function animateCup() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    cupXPercent = startXPercent + (targetXPercent - startXPercent) * eased;
    cupYPercent = startYPercent + (targetYPercent - startYPercent) * eased;
    
    updateCupPosition();
    
    if (progress < 1) {
      requestAnimationFrame(animateCup);
    } else {
      setTimeout(() => {
        cupCanCollect = true;
      }, 500);
    }
  }
  
  animateCup();
}

function collectAllDiceIntoCup() {
  const targetXPercent = 75;
  const targetYPercent = 70;
  
  const cupTargetX = canvas.offsetLeft + vwToPx(targetXPercent);
  const cupTargetY = canvas.offsetTop + vhToPx(targetYPercent);
  
  let animationIndex = 0;
  
  const lockedDiceCopy = [...lockedDice];
  lockedDiceCopy.forEach((die) => {
    if (die.element) {
      const delay = animationIndex * 100;
      animationIndex++;
      
      setTimeout(() => {
        const overlay = die.element.querySelector('.locked-overlay');
        if (overlay) overlay.remove();
        die.element.classList.remove('locked');
        
        animateToPosition(die.element, cupTargetX, cupTargetY, () => {
          if (die.element) {
            die.element.remove();
          }
        });
      }, delay);
    }
  });
  
  lockedDice.length = 0;
  
  dice.forEach((die) => {
    if (die.element && !die.rolling) {
      const delay = animationIndex * 100;
      animationIndex++;
      
      setTimeout(() => {
        animateToPosition(die.element, cupTargetX, cupTargetY, () => {
          if (die.element) {
            die.element.remove();
          }
        });
      }, delay);
    }
  });
  
  setTimeout(() => {
    dice.length = 0;
  }, animationIndex * 100 + 500);
  
  cupXPercent = targetXPercent;
  cupYPercent = targetYPercent;
  updateCupPosition();
}

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
        
        die.face = die.finalFace || Math.floor(Math.random() * 6) + 1;
        
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

window.addEventListener('resize', () => {
  resizeCanvas();
  updateCupPosition();
  
  dice.forEach(die => {
    renderDiePosition(die);
  });
  
  repositionLockedDice();
});

window.addEventListener("keydown", (key) => {
  if (key.key === "l") {
    localStorage.removeItem("lobbyName");
    window.location.href = "dices-hub.html";
  }
});