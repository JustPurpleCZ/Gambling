import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, get, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
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

let lobbies = [];
let selectedBetSize = 100;

// Check authentication
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

    initWallet(user);
}

async function initWallet(user) {
    const balanceSnap = await get(ref(db, `/users/${user.uid}/credits`));
    const balance = balanceSnap.val();
    const walletDisplay = document.querySelector('.wallet-display');
    walletDisplay.textContent = `Wallet: $${balance}`;
}

const pathRef = ref(db, "games/lobbies/dices");

// Load lobbies
async function loadLobbies() {
    lobbies = [];
    const snapshot = await get(pathRef);
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (const lobby in data) {
            lobbies.push(data[lobby]);
        }
    }

    displayLobbies();
}
const betSelector = document.querySelector('.bet-selector');
document.querySelectorAll('.bet-option').forEach(option => {
    option.addEventListener('click', () => {
        // Update selected bet size
        selectedBetSize = parseInt(option.dataset.bet);
        
        // Update the background image based on selected bet
        betSelector.className = 'bet-selector bet-' + selectedBetSize;
    });
});
// Display lobbies
function displayLobbies() {
    const container = document.getElementById("lobbiesContainer");
    container.innerHTML = '';

    if (lobbies.length === 0) {
        container.innerHTML = '<div class="no-lobbies">No lobbies available</div>';
        return;
    }

    lobbies.forEach(lobby => {
        const lobbyDiv = document.createElement("div");
        lobbyDiv.className = "lobby";
        
        // Set background image based on privacy status
        if (lobby.isPrivate) {
            lobbyDiv.style.backgroundImage = "url('main/dice/joinlocked.png')";
        } else {
            lobbyDiv.style.backgroundImage = "url('main/dice/joinfree.png')";
        }
        
        lobbyDiv.innerHTML = `
            <div class="lobby-info">
                <div>
                    <div class="lobby-value">${lobby.playerCount}/${lobby.maxPlayers}</div>
                </div>
                <div>
                    <div class="lobby-value">${lobby.name}</div>
                </div>
                <div>
                    <div class="lobby-value">$${lobby.betSize}</div>
                </div>
            </div>
            <div class="join-btn"></div>
        `;

        const joinBtn = lobbyDiv.querySelector('.join-btn');
        joinBtn.addEventListener('click', () => joinLobby(lobby.lobbyId));
        container.appendChild(lobbyDiv);
    });
}

// Create lobby
async function createLobby() {
    const inputLobbyName = document.getElementById("inputName").value;
    const inputMaxPlayers = document.getElementById("inputMaxPlayers").value;
    let inputPassword = document.getElementById("inputCreatePassword").value;
    const inputBetSize = document.getElementById("inputCreateBetSize").value;

    if (inputPassword === "") {
        inputPassword = null;
    }

    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://dices-create-gtw5ppnvta-ey.a.run.app", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "lobbyName": inputLobbyName,
            "maxPlayers": inputMaxPlayers,
            "password": inputPassword,
            "betSize": inputBetSize
        })
    });

    const response = await res.json();

    if (response.success) {
        localStorage.setItem("dicesLobbyId", response.lobbyId);
        localStorage.setItem("dicesIsHost", true);
        localStorage.setItem("selfUID", response.uid);
        window.location.href = "dices-game.html";
    } else {
        alert("Failed to create lobby: " + response.reply);
    }
}

// Join lobby
async function joinLobby(selectedLobbyId) {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_join", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "lobbyId": selectedLobbyId,
            "password": document.getElementById("inputJoinPassword").value
        })
    });

    const response = await res.json();

    if (response.success) {
        localStorage.setItem("dicesLobbyId", selectedLobbyId);
        localStorage.setItem("dicesIsHost", response.isHost);
        localStorage.setItem("selfUID", response.uid);
        window.location.href = "dices-game.html";
    } else {
        alert("Failed to join lobby: " + response.reply);
    }
}

// Quick join
async function quickJoin() {
    await loadLobbies();
    for (const lobby of lobbies) {
        if (lobby.maxPlayers == 2 && lobby.playerCount < 2 && 
            lobby.betSize == selectedBetSize && !lobby.isPrivate) {
            await joinLobby(lobby.lobbyId);
            return;
        }
    }

    // Create new lobby if none found
    const inputName = document.getElementById("inputName");
    const inputMaxPlayers = document.getElementById("inputMaxPlayers");
    const inputBetSize = document.getElementById("inputCreateBetSize");
    const inputCreatePassword = document.getElementById("inputCreatePassword");
    
    inputName.value = "Quick Join";
    inputMaxPlayers.value = "2";
    inputBetSize.value = selectedBetSize.toString();
    inputCreatePassword.value = "";
    
    await createLobby();
}

// UI Controls
const lobbiesModal = document.getElementById('lobbiesModal');

// Bet selector - single component with three sections
document.querySelectorAll('.bet-option').forEach(option => {
    option.addEventListener('click', () => {
        // Remove active class from all options
        document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('active'));
        
        // Add active class to clicked option
        option.classList.add('active');
        
        // Update selected bet size
        selectedBetSize = parseInt(option.dataset.bet);
        
        // Move indicator
        const indicator = document.querySelector('.bet-selector-indicator');
        indicator.className = 'bet-selector-indicator';
        indicator.classList.add('pos-' + option.dataset.position);
    });
});

// Quick join button
document.getElementById('quickJoinBtn').addEventListener('click', quickJoin);

// Lobbies button - opens both menus side by side
document.getElementById('lobbiesBtn').addEventListener('click', () => {
    lobbiesModal.classList.add('active');
    loadLobbies();
});

// Dealer button
document.getElementById('dealerBtn').addEventListener('click', () => {
    alert('Dealer mode coming soon!');
});

// Close modal
lobbiesModal.addEventListener('click', (e) => {
    if (e.target === lobbiesModal) {
        lobbiesModal.classList.remove('active');
    }
});

// Create form
document.getElementById('createForm').addEventListener('submit', (e) => {
    e.preventDefault();
    createLobby();
});

// Exit button
document.getElementById('exitBtn').addEventListener('click', () => {
    window.location.href = 'navigation.html';
});
let targetScore = 10;
let maxPlayers = 2;

document.getElementById('targetScoreUp').addEventListener('click', (e) => {
    e.preventDefault();
    if (targetScore < 50) {
        targetScore += 5;
        document.getElementById('targetScoreDisplay').textContent = targetScore;
        document.getElementById('inputTargetScore').value = targetScore;
    }
});

document.getElementById('targetScoreDown').addEventListener('click', (e) => {
    e.preventDefault();
    if (targetScore > 5) {
        targetScore -= 5;
        document.getElementById('targetScoreDisplay').textContent = targetScore;
        document.getElementById('inputTargetScore').value = targetScore;
    }
});

document.getElementById('playerCountUp').addEventListener('click', (e) => {
    e.preventDefault();
    if (maxPlayers < 8) {
        maxPlayers++;
        document.getElementById('playerCountDisplay').textContent = maxPlayers;
        document.getElementById('inputMaxPlayers').value = maxPlayers;
    }
});

document.getElementById('playerCountDown').addEventListener('click', (e) => {
    e.preventDefault();
    if (maxPlayers > 2) {
        maxPlayers--;
        document.getElementById('playerCountDisplay').textContent = maxPlayers;
        document.getElementById('inputMaxPlayers').value = maxPlayers;
    }
});

// Initialize
checkAuth();

// Auto-refresh lobbies every 5 seconds when modal is open
onChildAdded(pathRef, () => { loadLobbies(); });
onChildRemoved(pathRef, () => { loadLobbies(); });