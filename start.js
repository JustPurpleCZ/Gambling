// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    databaseURL: "https://gambling-goldmine-default-rtdb.europe-west1.firebasedatabase.app", // Add this line
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.appspot.com", // Fix this line
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
    
    // Show/hide username field and handle required attribute
    const displayNameInput = document.getElementById('displayName');
    if (isLogin) {
        displayNameInput.removeAttribute('required');
        displayNameInput.parentElement.style.display = 'none';
    } else {
        displayNameInput.setAttribute('required', '');
        displayNameInput.parentElement.style.display = 'block';
    }
    
    // Reset the form and error message
    errorMessage.textContent = '';
    authForm.reset();
});

// Handle form submission
// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const displayName = document.getElementById('displayName')?.value;

    try {
        if (isLogin) {
            // Login with Firebase
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                localStorage.setItem('currentUser', userCredential.user.uid);
                window.location.href = 'automat.html';
            } catch (error) {
                console.error('Login error:', error.code);
                switch (error.code) {
                    case 'auth/invalid-credential':
                        errorMessage.textContent = 'Incorrect email or password';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email format';
                        break;
                    case 'auth/user-not-found':
                        errorMessage.textContent = 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMessage.textContent = 'Incorrect password';
                        break;
                    default:
                        errorMessage.textContent = 'Login failed. Please try again.';
                }
            }
        } else {
            // Sign up with Firebase
            if (!email.includes('@')) {
                errorMessage.textContent = 'Please enter a valid email address';
                return;
            }
            
            if (password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters long';
                return;
            }

            if (displayName && displayName.length < 3) {
                errorMessage.textContent = 'Username must be at least 3 characters long';
                return;
            }

            // Check if username is already taken
            if (displayName) {
                const usernameRef = ref(db, 'usernames/' + displayName.toLowerCase());
                const usernameSnapshot = await get(usernameRef);
                
                if (usernameSnapshot.exists()) {
                    errorMessage.textContent = 'This username is already taken';
                    return;
                }
            }

            try {
                // Sign up with Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;
                
                // Reserve the username if provided
                if (displayName) {
                    await set(ref(db, 'usernames/' + displayName.toLowerCase()), uid);
                }
                
                // Create user profile in database
                await set(ref(db, 'users/' + uid), {
                    email,
                    displayName: displayName || email.split('@')[0], // Use username if provided, otherwise use email prefix
                    credits: 1000,
                    online: true,
                    lastSeen: Date.now(),
                    statistics: {
                        slotMachine: {
                        spins: 0,
                        moneywon: 0
                        }
                    },
                    achievements: []
                });
                
                localStorage.setItem('currentUser', uid);
                window.location.href = 'automat.html';
            } catch (error) {
                console.error('Signup error:', error.code);
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage.textContent = 'This email is already registered';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Please enter a valid email address';
                        break;
                    case 'auth/weak-password':
                        errorMessage.textContent = 'Password should be at least 6 characters';
                        break;
                    default:
                        errorMessage.textContent = 'Signup failed. Please try again.';
                }
            }
        }
    } catch (error) {
        console.error('Form submission error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
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