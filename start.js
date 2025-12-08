// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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
const auth = getAuth(app);

// Wait for auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.location.href = 'navigation.html';
        return;
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
                    const token = await userCredential.user.accessToken;

                    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/account_init", {
                        method: "POST",
                        headers: {
                            "Authorization": token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ username: null})
                    });

                    const data = await res.json();
                    console.log("Account init data: ", data);
                    window.location.href = 'navigation.html';
                } catch (error) {
                    console.error('Login error:', error);
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

                if (displayName && displayName.length < 3 || displayName.length > 12) {
                    errorMessage.textContent = 'Username must be between least 3 and 12 characters long';
                    return;
                }

                const res1 = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/username_check", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ username: displayName})
                    });

                const res1Data = await res1.json();

                if (res1Data.Response != 0) {
                    errorMessage.textContent = res1Data.message || 'Username is already taken';
                    return;
                }

                try {
                    // Sign up with Firebase
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const token = await userCredential.user.accessToken;

                    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/account_init", {
                        method: "POST",
                        headers: {
                            "Authorization": token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ username: displayName})
                    });

                    const data = await res.json();
                    console.log("Account init data: ", data);
                    window.location.href = 'navigation.html';
                    return;
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
});