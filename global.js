import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 0. AUTO-IMPORT ICONS ---
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
}

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. GLOBAL CSS INJECTION (Including Master Button Fix) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    /* MASTER BUTTON STYLE - Fixes the plain white box issue */
    .btn {
        background: linear-gradient(135deg, #FFD700 0%, #FFC400 100%) !important;
        color: #333 !important;
        border: none !important;
        padding: 10px 22px !important;
        border-radius: 25px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: transform 0.2s, box-shadow 0.2s !important;
        box-shadow: 0 3px 6px rgba(0,0,0,0.1) !important;
        font-size: 0.9rem !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        text-decoration: none !important;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 12px rgba(0,0,0,0.15) !important; }
    .btn:active { transform: scale(0.95); }

    /* Profile UI */
    .profile-menu-container { position: relative; display: flex; align-items: center; }
    .profile-avatar {
        width: 38px; height: 38px; border-radius: 50%; 
        background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);
        color: white; display: flex; align-items: center; justify-content: center;
        font-weight: bold; cursor: pointer; background-size: cover; background-position: center;
    }

    .dropdown-menu {
        position: absolute; top: 50px; right: 0; width: 200px;
        background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000;
    }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 12px 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #2E7D32; font-size: 0.85rem; }
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; }
    .dropdown-item:hover { background-color: #f1f8e9; }

    /* Mobile Envelope Icon (GitHub Inspired) */
    .msg-btn-mobile {
        background-color: #FFD700; color: #333; width: 36px; height: 36px;
        border-radius: 50%; display: none; align-items: center; justify-content: center;
        text-decoration: none; margin-right: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        font-size: 1rem;
    }
    
    /* Hide Envelope icon if already on messages/chat page */
    body.page-messages .msg-btn-mobile, body.page-chat .msg-btn-mobile { display: none !important; }

    /* Responsive Logic */
    .mobile-link { display: none; }
    @media (max-width: 767px) {
        nav { display: none !important; }
        .msg-btn-mobile { display: flex; }
        .mobile-link { display: flex; }
        .btn { padding: 8px 15px !important; font-size: 0.8rem !important; }
    }
`;
document.head.appendChild(globalStyle);

// --- 3. STATE & LISTENERS ---
let globalSettings = {};
let currentUser = null;

// Page detection
const path = window.location.pathname;
if (path.includes('messages.html')) document.body.classList.add('page-messages');
if (path.includes('chat.html')) document.body.classList.add('page-chat');

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) {
        globalSettings = docSnap.data();
        refreshUI();
    }
});

onAuthStateChanged(auth, (user) => {
    currentUser = (user && user.emailVerified) ? user : null;
    if (currentUser) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'banned') {
                signOut(auth).then(() => {
                    alert("Account Banned.");
                    window.location.href = '/LoginInToCheaplet.html';
                });
            }
        });
    }
    refreshUI();
});

function refreshUI() {
    if (globalSettings.enableGlobalHeader === false) return;
    if (currentUser) updateHeaderToLoggedIn(currentUser);
    else updateHeaderToLoggedOut();
}

// --- 4. UI BUILDERS ---

function updateHeaderToLoggedIn(user) {
    // Desktop Nav
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">Browse</a></li>
            <li><a href="/my-listings.html">My Listings</a></li>
            <li><a href="/messages.html">Messages</a></li>
        `;
    }

    // Right side injection
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalProfileMenu')) return;

    const name = user.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = user.photoURL ? `background-image: url('${user.photoURL}');` : '';
    const avatarContent = user.photoURL ? '' : initial;

    container.innerHTML = `
        <button class="btn" id="globalListBtn" style="margin-right: 12px;">List an Item</button>
        <a href="/messages.html" class="msg-btn-mobile"><i class="fas fa-envelope"></i></a>

        <div class="profile-menu-container" id="globalProfileMenu">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">${name}</div>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user"></i> My Profile</a>
                <a href="/search.html" class="dropdown-item mobile-link"><i class="fas fa-search"></i> Browse</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link"><i class="fas fa-list"></i> My Listings</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#d32f2f; border-top:1px solid #eee;">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </a>
            </div>
        </div>
    `;

    document.getElementById('globalListBtn').onclick = () => window.location.href = '/listanitem.html';
    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => menu.classList.remove('show'));
    document.getElementById('globalLogout').onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.href = '/index.html');
    };
}

function updateHeaderToLoggedOut() {
    const navUl = document.querySelector('nav ul');
    if (navUl) navUl.innerHTML = `<li><a href="/search.html">Browse</a></li>`;

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalLoginBtn')) return;

    container.innerHTML = `
        <button class="btn" id="globalListBtn">List an Item</button>
        <button class="btn" id="globalLoginBtn" style="margin-left: 10px;">Login / Register</button>
    `;

    document.getElementById('globalListBtn').onclick = () => {
        alert("Please log in to list an item.");
        window.location.href = '/LoginInToCheaplet.html';
    };
    document.getElementById('globalLoginBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
}

// Logo Click Logic
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.onclick = () => window.location.href = '/index.html';
    }
});
