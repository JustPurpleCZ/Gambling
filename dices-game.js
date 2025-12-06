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

const playStuff = document.getElementById("playStuff");
const rolledDiceDiv = document.getElementById("rolledDice");
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

          document.getElementById("moveBtn").addEventListener("click", () => {
            submitMove();
          })

          document.getElementById("rollBtn").addEventListener("click", () => {
            rollDice();
          })
        }
    });
}

async function updateActivePlayerList() {
    const playersInfo = await get(activePlayersRef);
    console.log("Updating active player list");
    let gameEnded = false;

    const gameEndSnap = await get(ref(db, `/games/active/dices/${lobbyId}/gameEnded`));
    if (snap.exists() && snap.val()) {
        console.log("Game has ended");
        gameEnded = true;
    }

    activePlayerList.replaceChildren();
    let isMyTurnThisUpdate = false;
    for (const player of playerOrder) {
        // Create the div FIRST
        const activePlayerDiv = document.createElement("div");
        const name = document.createElement("p");
        const score = document.createElement("p");
        const parTurnScore = document.createElement("p");
        
        // Now check if needed (though this check might not be necessary)
        // if (activePlayerList.contains(activePlayerDiv)) {
        //     continue;
        // }
        
        activePlayerList.appendChild(activePlayerDiv);
        activePlayerDiv.appendChild(name);
        activePlayerDiv.appendChild(score);
        activePlayerDiv.appendChild(parTurnScore);
        
        name.textContent = playersInfo.val()[player].username;
        score.textContent = playersInfo.val()[player].score;
        parTurnScore.textContent = playersInfo.val()[player].turnScore;

        if (playersInfo.val()[player].playersTurn == true) {
          const theirTurn = document.createElement("p");
          activePlayerDiv.appendChild(theirTurn);
          theirTurn.textContent = "Playing";

          if (player == uid && !gameEnded) {
            isMyTurnThisUpdate = true;
            playStuff.style.display = "block";

            const turnScoreSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/turnScore`));
            const turnScore = turnScoreSnap.val();
            document.getElementById("turnScorePar").textContent = "Your score this turn: " + turnScore;

            rolledDiceDiv.replaceChildren();
            const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
            const snapshot = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));

            const rolledDice = snap.val();
            const heldDice = snapshot.val();

            console.log("Rolls:", rolledDice, heldDice);

            rolledDiceDiv.replaceChildren();

            if (rolledDice) {
                for (let i = 0; i < rolledDice.length; i++) {
                    console.log("Adding dice button");
                    const diceBtn = document.createElement("button");
                    rolledDiceDiv.appendChild(diceBtn);
                    diceBtn.textContent = rolledDice[i];
                    const rollIndex = i;

                    if (heldDice[i]) {
                        diceBtn.classList.add("heldDice");
                    }

                    diceBtn.addEventListener("click", () => {
                        errorMessage.style.display = "none";

                        if (diceBtn.classList.contains("heldDice")) {
                            diceBtn.classList.remove("heldDice");
                            set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${rollIndex}`), false);
                        } else {
                            diceBtn.classList.add("heldDice");
                            set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${rollIndex}`), true);
                        }
                    })
                }
            }

          } else {
            playStuff.style.display = "none";

            const rolledDice = document.createElement("p");
            const heldDice = document.createElement("p");

            activePlayerDiv.appendChild(rolledDice);
            activePlayerDiv.appendChild(heldDice);

            rolledDice.textContent = playersInfo.val()[player].rolledDice;
            heldDice.textContent = playersInfo.val()[player].heldDice;
          }
        }

        if (playersInfo.val()[player].connected == false) {
          const connected = document.createElement("p");
          activePlayerDiv.appendChild(connected);
          connected.textContent = "Disconnected";
        }

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
    }
    if (wasMyTurnLastUpdate && !isMyTurnThisUpdate) {
        console.log("My turn just ended. Waiting before collecting all dice.");
        // Wait 2 seconds before collecting dice
        setTimeout(() => {
            collectAllDiceIntoCup();
        }, 2000);
    }


    // UPDATE GLOBAL STATE
    wasMyTurnLastUpdate = isMyTurnThisUpdate;
}

async function rollDice() {
    console.log("Rolling dice");
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
            errorMessage.style.display = "none";
        } else {
            errorMessage.style.display = "block";
            errorMessage.textContent = response.reply;
        }
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
    console.log("Move response:", response);

    if (response.success) {
            errorMessage.style.display = "none";
            collectAllDiceIntoCup();
        } else {
            errorMessage.style.display = "block";
            errorMessage.textContent = response.reply;
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
let pendingRollValues = null;
let cupCanCollect = true;
let wasMyTurnLastUpdate = false;

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

document.addEventListener('mouseup', async () => {
  if (!isDraggingCup) return;
  isDraggingCup = false;
  cup.classList.remove('dragging');
  
  // Check if ALL dice are collected (cup is full)
  // All dice collected = dice.length is 0 (they're in the cup, not on table)
  if (dice.length === 0 && cupState === 'normal') {
    // Call the roll function first
    const rollSuccess = await performRoll();
    
    // Then spill dice with the returned values if roll succeeded
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
        errorMessage.style.display = "none";
        
        // Get the rolled dice values from Firebase
        const rolledSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
        pendingRollValues = rolledSnap.val();
        console.log("Dice values from server:", pendingRollValues);
        
        return true;
      } else {
        errorMessage.style.display = "block";
        errorMessage.textContent = response.reply;
        pendingRollValues = null;
        return false;
      }
    } else {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Maximum rolls reached!";
      pendingRollValues = null;
      return false;
    }
  } catch (error) {
    console.error("Roll error:", error);
    errorMessage.style.display = "block";
    errorMessage.textContent = "Roll failed. Please try again.";
    pendingRollValues = null;
    return false;
  }
}
// --- GAME LOGIC ---

function spillDice() {
  cupState = 'spilling';
  cup.style.backgroundImage = `url(${cupSpillImg})`;
  cupCanCollect = false;
  const angleRad = Math.atan2(cupVelocityY, cupVelocityX);
  let angleDeg = angleRad * (180 / Math.PI);

  cup.style.transform = `rotate(${angleDeg+90}deg) scale(1.1)`;
  
  // Use server values if available, otherwise generate random
  const diceValues = pendingRollValues || [];
  const numDice = diceValues.length || (6 - lockedDice.length);
  
  const launchSpeedMultiplier = 4;
  const baseVx = cupVelocityX !== 0 ? cupVelocityX * launchSpeedMultiplier : 5;
  const baseVy = cupVelocityY !== 0 ? cupVelocityY * launchSpeedMultiplier : 0;
  
  for (let i = 0; i < numDice; i++) {
    const spread = (Math.random() - 0.5) * 50;
    
    // Use server value if available, otherwise random
    const faceValue = diceValues[i] || (Math.floor(Math.random() * 6) + 1);
    
    dice.push({
      xPercent: cupXPercent + 5, 
      yPercent: cupYPercent + 30, 
      vx: baseVx + spread,
      vy: baseVy + spread,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      face: faceValue,
      finalFace: faceValue, // Store the final face value
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
    
    renderDiePosition(die);
    
    die.clickHandler = () => lockDie(die);
    el.addEventListener('click', die.clickHandler);
  });
  
  isRolling = true;
  cupVelocityX = 0;
  cupVelocityY = 0;
  
  // Clear pending values
  pendingRollValues = null;
  
  // Wait 500ms, then move cup to bottom right
  setTimeout(() => {
    moveCupToBottomRight();
  }, 500);
}

function collectDice() {
  if (!cupCanCollect) return; // Don't collect if disabled
  
  const cupSize = vhToPx(20);
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
    }
  }
}

async function lockDie(die) {
  if (die.rolling) return;
  const index = dice.indexOf(die);
  if (index === -1) return;
  
  // Find the corresponding dice button in the UI and mark it as held in the server
  const rolledDiceButtons = rolledDiceDiv.querySelectorAll('button');
  
  // Find which die this is based on its face value and position
  // We need to match it to the rolledDice array
  const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
  const rolledDiceValues = snap.val();
  
  if (rolledDiceValues) {
    // Find the first unheld die with matching face value
    const heldSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
    const heldDice = heldSnap.val() || [];
    
    for (let i = 0; i < rolledDiceValues.length; i++) {
      if (rolledDiceValues[i] === die.face && !heldDice[i]) {
        // Mark this die as held in the server
        await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${i}`), true);
        
        // Also update the UI button if it exists
        if (rolledDiceButtons[i]) {
          rolledDiceButtons[i].classList.add('heldDice');
        }
        break;
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
  const targetX = containerW * 0.032; //-
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
  
  // Unmark the die in the server
  const snap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/rolledDice`));
  const rolledDiceValues = snap.val();
  
  if (rolledDiceValues) {
    // Find which die this is and unmark it
    const heldSnap = await get(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice`));
    const heldDice = heldSnap.val() || [];
    
    for (let i = 0; i < rolledDiceValues.length; i++) {
      if (rolledDiceValues[i] === die.face && heldDice[i]) {
        // Unmark this die in the server
        await set(ref(db, `/games/active/dices/${lobbyId}/players/${uid}/heldDice/${i}`), false);
        
        // Also update the UI button if it exists
        const rolledDiceButtons = rolledDiceDiv.querySelectorAll('button');
        if (rolledDiceButtons[i]) {
          rolledDiceButtons[i].classList.remove('heldDice');
        }
        break;
      }
    }
  }
  
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
    // Exact same math as lockDie, but using index 'i'
    const targetX = containerW * 0.032; //-
    const targetY = (containerH * 0.17) + (lockedDice.length * (containerH * 0.1175));
    
    // If not animating, just set it
    if(die.element) {
        die.element.style.left = targetX + 'px';
        die.element.style.top = targetY + 'px';
    }
  });
}
function moveCupToBottomRight() {
  // Set target position to bottom right (relative to canvas)
  const targetXPercent = 75; // 75% from left
  const targetYPercent = 60; // 70% from top
  
  const startXPercent = cupXPercent;
  const startYPercent = cupYPercent;
  
  const duration = 800; // Animation duration in ms
  const startTime = Date.now();
  
  // Reset cup to normal state
  cupState = 'normal';
  cup.style.backgroundImage = `url(${cupImg})`;
  cup.style.transform = 'scale(1) rotate(0deg)';
  
  function animateCup() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    
    cupXPercent = startXPercent + (targetXPercent - startXPercent) * eased;
    cupYPercent = startYPercent + (targetYPercent - startYPercent) * eased;
    
    updateCupPosition();
    
    if (progress < 1) {
      requestAnimationFrame(animateCup);
    } else {
      // Re-enable collection after animation completes and another 500ms
      setTimeout(() => {
        cupCanCollect = true;
      }, 500);
    }
  }
  
  animateCup();
}
function collectAllDiceIntoCup() {
  // First, move cup to bottom right if not already there
  const targetXPercent = 75;
  const targetYPercent = 95;
  
  // Calculate cup target position in pixels
  const cupTargetX = canvas.offsetLeft + vwToPx(targetXPercent);
  const cupTargetY = canvas.offsetTop + vhToPx(targetYPercent);
  
  let animationIndex = 0;
  
  // First, unlock and collect all locked dice
  const lockedDiceCopy = [...lockedDice]; // Make a copy since we'll be modifying the array
  lockedDiceCopy.forEach((die) => {
    if (die.element) {
      const delay = animationIndex * 100;
      animationIndex++;
      
      setTimeout(() => {
        // Remove the locked overlay
        const overlay = die.element.querySelector('.locked-overlay');
        if (overlay) overlay.remove();
        die.element.classList.remove('locked');
        
        // Animate to cup
        animateToPosition(die.element, cupTargetX, cupTargetY, () => {
          if (die.element) {
            die.element.remove();
          }
        });
      }, delay);
    }
  });
  
  // Clear locked dice array
  lockedDice.length = 0;
  
  // Then animate all dice on the table to slide into the cup
  dice.forEach((die) => {
    if (die.element && !die.rolling) {
      const delay = animationIndex * 100;
      animationIndex++;
      
      setTimeout(() => {
        animateToPosition(die.element, cupTargetX, cupTargetY, () => {
          // Remove the die element after it reaches the cup
          if (die.element) {
            die.element.remove();
          }
        });
      }, delay);
    }
  });
  
  // Clear the dice array after all animations
  setTimeout(() => {
    dice.length = 0; // Clear all dice from the array
  }, animationIndex * 100 + 500);
  
  // Move cup to bottom right
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
    
    // Use finalFace if it exists (from server), otherwise random
    die.face = die.finalFace || Math.floor(Math.random() * 6) + 1;
    
    if (die.element) {
        die.element.classList.remove('rolling');
        die.element.style.backgroundImage = `url(${diceImages[die.face - 1]})`;
    }
    } else {
    allStopped = false;
    }
      
      // 6. RENDER
      renderDiePosition(die);
    }
  });
  
  if (allStopped && isRolling) {
    isRolling = false;
  }
  
  requestAnimationFrame(update);
}

update();

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