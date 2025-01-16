// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.firebasestorage.app",
    messagingSenderId: "159900206701",
    appId: "1:159900206701:web:01223c4665df6f7377a164"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase();

// Check if user is already logged in
if (localStorage.getItem('currentUser')) {
    window.location.href = 'automat.html';
}

// Get DOM elements
const playButton = document.getElementById('playButton');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const submitButton = document.getElementById('submitButton');
const toggleAuth = document.getElementById('toggleAuth');
const closeModal = document.getElementById('closeModal');
const errorMessage = document.getElementById('errorMessage');

let isLogin = true;

// Show modal when Play is clicked
playButton.addEventListener('click', () => {
    authModal.style.display = 'block';
});

// Close modal when X is clicked
closeModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    resetForm();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
        resetForm();
    }
});

// Toggle between login and signup
toggleAuth.addEventListener('click', () => {
    isLogin = !isLogin;
    modalTitle.textContent = isLogin ? 'Login' : 'Create Account';
    submitButton.textContent = isLogin ? 'Login' : 'Create Account';
    toggleAuth.textContent = isLogin ? 'Need an account? Sign up' : 'Already have an account? Login';
    errorMessage.textContent = '';
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        if (isLogin) {
            // Login with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, username, password);
            localStorage.setItem('currentUser', userCredential.user.uid);
        } else {
            // Sign up with Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, username, password);
            const uid = userCredential.user.uid;
            
            // Create user profile in database
            await set(ref(db, 'users/' + uid), {
                username,
                credits: 1000,
                online: true,
                lastSeen: Date.now(),
                statistics: {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0
                },
                achievements: []
            });
            
            localStorage.setItem('currentUser', uid);
        }

        // Redirect to game page
        window.location.href = 'automat.html';
    } catch (error) {
        console.error(error);
        errorMessage.textContent = error.message;
    }
});

// Reset form helper function
function resetForm() {
    authForm.reset();
    errorMessage.textContent = '';
}

// Track online players
function trackOnlinePlayers() {
    const onlineRef = ref(db, 'users');
    onValue(onlineRef, (snapshot) => {
        const users = snapshot.val();
        if (users) {
            const onlineUsers = Object.values(users).filter(user => user.online);
            console.log(`Online players: ${onlineUsers.length}`);
        }
    });
}

// Start tracking online players
trackOnlinePlayers();