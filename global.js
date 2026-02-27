import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. GLOBAL CSS INJECTION (Updated for Mobile UI) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    /* Profile Dropdown Styles */
    .profile-menu-container { position: relative; display: flex; align-items: center; }
    
    .profile-avatar {
        width: 38px; height: 38px; border-radius: 50%; 
        background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);
        color: white; display: flex; align-items: center; justify-content: center;
        font-weight: bold; cursor: pointer; background-size: cover; background-position: center;
        transition: transform 0.2s;
    }

    .dropdown-menu {
        position: absolute; top: 50px; right: 0; width: 200px;
        background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000;
    }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 12px 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #2E7D32; font-size: 0.85rem; }
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; }
    .dropdown-item:hover { background-color: #f1f8e9; }

    /* New Yellow Message Icon Button (GitHub Inspired) */
    .msg-btn-mobile {
        background-color: #FFD700; color: #333; width: 35px; height: 35px;
        border-radius: 50%; display: none; align-items: center; justify-content: center;
        text-decoration: none; margin-right: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-size: 1rem; transition: transform 0.2s;
    }
    .msg-btn-mobile:active { transform: scale(0.9); }

    /* RESPONSIVE LOGIC */
    .mobile-link { display: none; } /* Hidden by default on desktop */

    @media (max-width: 767px) {
        nav { display: none !important; } /* Hide main horizontal nav */
        .msg-btn-mobile { display: flex; } /* Show yellow msg icon */
        .mobile-link { display: flex; } /* Show browse/listings in dropdown */
        #globalListBtn { padding: 8px 12px; font-size: 0.85rem; } /* Shrink list button slightly */
    }

    /* Language Modal */
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; }
    .lang-modal { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; }
    .lang-btn { display: block; width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; }
`;
document.head.appendChild(globalStyle);

// --- 3. STATE & LISTENERS ---
let globalSettings = {};
let currentUser = null;

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) {
        globalSettings = docSnap.data();
        refreshUI();
    }
});

onAuthStateChanged(auth, (user) => {
    currentUser = (user && user.emailVerified) ? user : null;
    refreshUI();
});

// --- 4. UI REFRESH ENGINE ---
function refreshUI() {
    if (globalSettings.enableGlobalHeader === false) return;
    
    if (currentUser) {
        updateHeaderToLoggedIn(currentUser);
    } else {
        updateHeaderToLoggedOut();
    }
}

// --- LOGGED IN UI (Mobile & Desktop Optimized) ---
function updateHeaderToLoggedIn(user) {
    // 1. Desktop Nav (Hidden on Mobile via CSS)
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">Browse</a></li>
            <li><a href="/my-listings.html">My Listings</a></li>
            <li><a href="/messages.html">Messages</a></li>
        `;
    }

    // 2. Right Side Injection
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalProfileMenu')) return;

    const name = user.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = user.photoURL ? `background-image: url('${user.photoURL}');` : '';
    const avatarContent = user.photoURL ? '' : initial;

    container.innerHTML = `
        <button class="btn" id="globalListBtn" style="margin-right: 12px;">List an Item</button>
        
        <!-- Yellow Message Icon (Mobile Only) -->
        <a href="/messages.html" class="msg-btn-mobile" title="Messages">
            <i class="fas fa-envelope"></i>
        </a>

        <div class="profile-menu-container" id="globalProfileMenu">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">${name}</div>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user"></i> My Profile</a>
                
                <!-- Hidden on Desktop, Visible on Mobile -->
                <a href="/search.html" class="dropdown-item mobile-link"><i class="fas fa-search"></i> Browse</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link"><i class="fas fa-list"></i> My Listings</a>
                
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#d32f2f; border-top: 1px solid #eee;">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </a>
            </div>
        </div>
    `;

    // Listeners
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

// --- LOGGED OUT UI ---
function updateHeaderToLoggedOut() {
    const navUl = document.querySelector('nav ul');
    if (navUl) navUl.innerHTML = `<li><a href="/search.html">Browse</a></li>`;

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalLoginBtn')) return;

    container.innerHTML = `
        <button class="btn" id="globalListBtn">List an Item</button>
        <button class="btn" id="globalLoginBtn" style="margin-left: 10px;">Login / Register</button>
    `;

    document.getElementById('globalListBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
    document.getElementById('globalLoginBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
}

// Logo home redirect
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
