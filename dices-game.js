console.log("Lobby id:" + localStorage.getItem("dicesLobbyId") + "Is host:" + localStorage.getItem("dicesIsHost"));

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onValue, onChildAdded, onChildRemoved, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

const lobbyId = localStorage.getItem("dicesLobbyId");
const playersRef = ref(db, `/games/lobbies/dices/${lobbyId}/players`);

const playerList = document.getElementById("playerList");

onChildAdded(playersRef, (snapshot) => {
    const player = snapshot.val();
    console.log("Player joined:", player.username);

    const playerPar = document.createElement("p");
    playerList.appendChild(playerPar);
    playerPar.textContent = player.username;
});

onChildRemoved(playersRef, (snapshot) => {
    const player = snapshot.val();
    const username = player.username;
    console.log("Player left:", player.username);

    const paragraphs = playerList.querySelectorAll("p");
    
    paragraphs.forEach(p => {
        if (p.textContent === username) {
            p.remove();
        }
    });
});

async function loadPlayers() {
    const snapshot = await get(playersRef);
    if (snapshot.exists()) {
        const data = snapshot.val();

        for (const player in data) {
            const playerPar = document.createElement("p");
            playerList.appendChild(playerPar);
            playerPar.textContent = player.username;
        }

        console.log("Players loaded");

    } else {
        console.log("Failed to load players");
    }
}

loadPlayers();