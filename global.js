import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
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
const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. TRANSLATION DICTIONARY ---
const translations = {
    "en": { "nav_browse": "Browse", "nav_listings": "My Listings", "nav_messages": "Messages", "nav_profile": "My Profile", "btn_login": "Login / Register", "btn_list": "List an Item", "btn_browse": "Start Browsing", "btn_signout": "Sign Out", "search_placeholder": "What are you looking for?", "hero_title": "Great Finds, Unbeatable Prices.", "hero_sub": "Cheaplet is the online marketplace for smart savings.", "verified_student": "Verified Student", "ban_message": "ACCESS DENIED: Your account has been banned." },
    "fr": { "nav_browse": "Parcourir", "nav_listings": "Mes Annonces", "nav_messages": "Messages", "nav_profile": "Mon Profil", "btn_login": "Connexion", "btn_list": "Vendre un article", "btn_browse": "Commencer à naviguer", "btn_signout": "Déconnexion", "search_placeholder": "Que cherchez-vous ?", "hero_title": "Super trouvailles, prix imbattables.", "hero_sub": "Cheaplet est le marché en ligne pour des économies intelligentes.", "verified_student": "Étudiant vérifié", "ban_message": "ACCÈS REFUSÉ : Votre compte a été banni." }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) el.placeholder = translations[lang][key];
    });
    localStorage.setItem('preferred_language', lang);
};

// --- 3. GLOBAL CSS (Added Ban Overlay) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    .btn { background: linear-gradient(135deg, #FFD700 0%, #FFC400 100%) !important; color: #333 !important; border: none !important; padding: 0 18px !important; height: 38px !important; line-height: 38px !important; border-radius: 20px !important; font-weight: bold !important; cursor: pointer !important; transition: transform 0.2s !important; box-shadow: 0 3px 6px rgba(0,0,0,0.1) !important; font-size: 0.85rem !important; display: inline-flex !important; align-items: center; justify-content: center; text-align: center; white-space: nowrap !important; text-decoration: none !important; }
    .profile-menu-container { position: relative; display: flex; align-items: center; }
    .profile-avatar { width: 38px; height: 38px; border-radius: 50%; background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; background-size: cover; background-position: center; }
    .dropdown-menu { position: absolute; top: 50px; right: 0; width: 220px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000; }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 12px 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #2E7D32; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
    .student-badge { display: inline-flex; align-items: center; gap: 5px; background: #E8F5E9; color: #2E7D32; font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; width: fit-content; border: 1px solid #C8E6C9; margin-top: 2px; }
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; }
    .dropdown-item:hover { background-color: #f1f8e9; }
    .msg-btn-mobile { background-color: #FFD700; color: #333; width: 36px; height: 36px; border-radius: 50%; display: none; align-items: center; justify-content: center; text-decoration: none; margin-right: 12px; font-size: 1rem; }
    body.page-messages .msg-btn-mobile, body.page-chat .msg-btn-mobile { display: none !important; }
    .lang-modal-overlay, #ban-blocker { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 100000; display: flex; justify-content: center; align-items: center; }
    .lang-modal { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .lang-btn { display: block; width: 100%; padding: 14px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
    #ban-blocker { background: #000; color: #ff3b30; flex-direction: column; font-weight: bold; font-size: 1.5rem; text-align: center; padding: 20px; }
    @media (max-width: 767px) { nav { display: none !important; } .msg-btn-mobile { display: flex; } .mobile-link { display: flex; } .btn { font-size: 0.75rem !important; padding: 0 12px !important; height: 34px !important; } }
`;
document.head.appendChild(globalStyle);

// --- 4. STATE & LISTENERS ---
let globalSettings = {};
let currentUserData = null;

const path = window.location.pathname;
if (path.includes('messages.html')) document.body.classList.add('page-messages');
if (path.includes('chat.html')) document.body.classList.add('page-chat');

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) { globalSettings = docSnap.data(); refreshUI(); }
});

onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                
                // --- INSTANT LOCKDOWN LOGIC ---
                if (currentUserData.role === 'banned') {
                    showBanBlocker();
                    setTimeout(() => {
                        signOut(auth).then(() => { window.location.href = '/LoginInToCheaplet.html'; });
                    }, 2000);
                    return;
                }
                
                if (currentUserData.language) localStorage.setItem('preferred_language', currentUserData.language);
                refreshUI();
            }
        });
    } else {
        currentUserData = null;
        refreshUI();
    }
});

function showBanBlocker() {
    if (document.getElementById('ban-blocker')) return;
    const blocker = document.createElement('div');
    blocker.id = 'ban-blocker';
    const lang = localStorage.getItem('preferred_language') || 'en';
    blocker.innerHTML = `<i class="fas fa-user-slash fa-3x" style="margin-bottom:20px;"></i><div>${translations[lang].ban_message}</div>`;
    document.body.appendChild(blocker);
}

function refreshUI() {
    if (globalSettings.enableGlobalHeader === false) return;
    if (currentUserData) updateHeaderToLoggedIn(currentUserData);
    else {
        updateHeaderToLoggedOut();
        if (globalSettings.enableLanguagePrompt && !sessionStorage.getItem('lang_picked_this_session')) {
            showLanguagePopup();
        }
    }
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    window.applyLanguage(savedLang);
}

// --- 5. UI BUILDERS ---
function updateHeaderToLoggedIn(userData) {
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html" data-i18n="nav_browse">Browse</a></li>
            <li><a href="/my-listings.html" data-i18n="nav_listings">My Listings</a></li>
            <li><a href="/messages.html" data-i18n="nav_messages">Messages</a></li>
        `;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    const name = userData.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = userData.photoURL ? `background-image: url('${userData.photoURL}');` : '';
    const avatarContent = userData.photoURL ? '' : initial;
    const studentBadgeHTML = userData.isStudent ? `<div class="student-badge"><i class="fas fa-graduation-cap"></i> <span data-i18n="verified_student">Verified Student</span></div>` : '';

    container.innerHTML = `
        <button class="btn" id="globalListBtn" style="margin-right: 12px;" data-i18n="btn_list">List an Item</button>
        <a href="/messages.html" class="msg-btn-mobile"><i class="fas fa-envelope"></i></a>
        <div class="profile-menu-container" id="globalProfileMenu">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header"><span>${name}</span>${studentBadgeHTML}</div>
                <a href="/profile.html" class="dropdown-item" data-i18n="nav_profile"><i class="fas fa-user"></i> My Profile</a>
                <a href="/search.html" class="dropdown-item mobile-link" data-i18n="nav_browse"><i class="fas fa-search"></i> Browse</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link" data-i18n="nav_listings"><i class="fas fa-list"></i> My Listings</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#d32f2f; border-top: 1px solid #eee;" data-i18n="btn_signout">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </a>
            </div>
        </div>
    `;

    document.getElementById('globalListBtn').onclick = () => window.location.href = '/listanitem.html';
    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    if(avatar) avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => { if(menu) menu.classList.remove('show'); });
    const logout = document.getElementById('globalLogout');
    if(logout) logout.onclick = () => signOut(auth).then(() => { 
        sessionStorage.clear(); 
        window.location.href = '/index.html'; 
    });
}

function updateHeaderToLoggedOut() {
    const navUl = document.querySelector('nav ul');
    if (navUl) navUl.innerHTML = `<li><a href="/search.html" data-i18n="nav_browse">Browse</a></li>`;
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;
    container.innerHTML = `
        <button class="btn" id="globalListBtn" data-i18n="btn_list">List an Item</button>
        <button class="btn" id="globalLoginBtn" style="margin-left: 10px;" data-i18n="btn_login">Login / Register</button>
    `;
    document.getElementById('globalListBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
    document.getElementById('globalLoginBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
}

function showLanguagePopup() {
    if (document.getElementById('lang-modal')) return;
    const checkBody = setInterval(() => {
        if (document.body) {
            clearInterval(checkBody);
            const modal = document.createElement('div');
            modal.id = 'lang-modal';
            modal.className = 'lang-modal-overlay';
            modal.innerHTML = `
                <div class="lang-modal">
                    <h2 style="color:#2E7D32; margin-bottom:10px;">Welcome / Bienvenue</h2>
                    <p style="color:#666; margin-bottom:20px;">Please select your language.</p>
                    <button class="lang-btn" id="btn-en">English</button>
                    <button class="lang-btn" id="btn-fr">Français</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('btn-en').onclick = () => selectLang('en', modal);
            document.getElementById('btn-fr').onclick = () => selectLang('fr', modal);
        }
    }, 100);
}

function selectLang(l, modal) {
    window.applyLanguage(l);
    sessionStorage.setItem('lang_picked_this_session', 'true'); 
    modal.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
