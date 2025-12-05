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

    if (response.success) {
        set(presenceRef, true);
        onDisconnect(presenceRef).cancel();
    } else {
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
    console.log("Active presence set");

    onChildRemoved(ref(db, `/games/active/dices`), (removedLobby) => {
        if (removedLobby.key === lobbyId) {
            onDisconnect(activePresenceRef).cancel();
            window.location.href = "dices-hub.html";
        }
    });

    console.log("Setting player list updates");
    onValue(ref(db, `/games/active/dices/${lobbyId}/playerOrder`), (snap) => {
        console.log("Player list info changed: ", snap.val());
        if (snap.val() != null) {
          playerOrder = snap.val();
          console.log("Player order: ", playerOrder);

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
    console.log("Updating active player list");
    const playersInfo = await get(activePlayersRef);
    console.log("Player info success");
    let gameEnded = true;

    activePlayerList.replaceChildren();
     for (const player of playerOrder) {
        if (activePlayerDiv.children.contains(player)) {
            continue;
        }

        const activePlayerDiv = document.createElement("div");
        const name = document.createElement("p");
        const score = document.createElement("p");
        const parTurnScore = document.createElement("p");
        
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
          gameEnded = false;

          if (player == uid && !gameEnded) {
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
        } else {
            errorMessage.style.display = "block";
            errorMessage.textContent = response.reply;
        }
}