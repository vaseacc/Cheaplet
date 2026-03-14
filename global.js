import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 0. AUTO-IMPORT ICONS & FAVICON ---
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
}

if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
    document.head.appendChild(favicon);
}

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. TRANSLATION DICTIONARY ---
const translations = {
    "en": { 
        "nav_browse": "Browse", "nav_listings": "My Listings", "nav_messages": "Messages", "nav_profile": "My Profile", 
        "btn_login": "Login / Register", "btn_list": "List an Item", "btn_signout": "Sign Out", 
        "verified_student": "Verified Student",
        "ban_title": "ACCESS DENIED",
        "ban_text": "This account has been permanently banned."
    },
    "fr": { 
        "nav_browse": "Parcourir", "nav_listings": "Mes Annonces", "nav_messages": "Messages", "nav_profile": "Mon Profil", 
        "btn_login": "Connexion", "btn_list": "Vendre", "btn_signout": "Déconnexion", 
        "verified_student": "Étudiant vérifié",
        "ban_title": "ACCÈS REFUSÉ",
        "ban_text": "Ce compte a été définitivement banni."
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    localStorage.setItem('preferred_language', lang);
};

// --- 3. GLOBAL CSS (INK & GOLD THEME) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    /* Header centering and spacing */
    .header-inner, .header-content { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    nav { flex-grow: 1; display: flex; justify-content: center; }
    nav ul { display: flex; list-style: none; gap: 28px; padding: 0; margin: 0; }
    nav ul li a { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; white-space: nowrap; }
    nav ul li a:hover { color: #FFFFFF; }

    .btn { background: linear-gradient(135deg, #C8A96E 0%, #ddb97a 100%) !important; color: #0C1446 !important; border: none !important; padding: 0 18px !important; height: 38px !important; line-height: 38px !important; border-radius: 20px !important; font-weight: bold !important; cursor: pointer !important; transition: transform 0.2s !important; font-size: 0.85rem !important; display: inline-flex !important; align-items: center; justify-content: center; text-decoration: none !important; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200,169,110,0.3) !important; }
    
    .profile-menu-container { position: relative; display: flex; align-items: center; z-index: 1001; }
    .profile-avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #1a2a4a; border: 2px solid #C8A96E; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; background-size: cover; background-position: center; overflow: hidden; }
    
    .dropdown-menu { position: absolute; top: 50px; right: 0; width: 220px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000; border: 1px solid #eee; }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #0C1446; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px; }
    
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
    .dropdown-item:hover { background-color: #f4f7fc; color: #2B5C92; }
    
    .msg-btn-mobile { background: #C8A96E; color: #0C1446; width: 36px; height: 36px; border-radius: 50%; display: none; align-items: center; justify-content: center; text-decoration: none; margin-right: 12px; font-size: 1rem; }
    
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12,20,70,0.85); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .lang-modal { background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .lang-btn { display: block; width: 100%; padding: 16px; margin: 12px 0; border: 2px solid #EBF2FA; border-radius: 12px; background: white; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; color: #0C1446; }
    .lang-btn:hover { border-color: #C8A96E; background: #fdfaf4; }

    .terms-banner { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(12, 20, 70, 0.98); color: #fff; padding: 15px 25px; display: flex; justify-content: center; align-items: center; gap: 25px; z-index: 99999; font-size: 0.85rem; backdrop-filter: blur(10px); border-top: 1px solid rgba(200,169,110,0.3); }
    .btn-accept-terms { background: #C8A96E; color: #0C1446; border: none; padding: 8px 30px; border-radius: 20px; font-weight: 800; cursor: pointer; }

    .desktop-only { display: inline-flex; }
    .mobile-link { display: none; }

    @media (max-width: 767px) {
        nav { display: none !important; }
        .msg-btn-mobile { display: flex; }
        .desktop-only { display: none !important; }
        .mobile-link { display: flex; }
        .terms-banner { flex-direction: column; text-align: center; padding-bottom: max(20px, env(safe-area-inset-bottom)); gap: 12px; }
    }
`;
document.head.appendChild(globalStyle);

// --- 4. STATE & LISTENERS ---
let globalSettings = {};
let currentUserData = null;

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) { globalSettings = docSnap.data(); refreshUI(); }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                if (currentUserData.role === 'banned') { triggerHardLockdown(); return; }
                if (currentUserData.language) localStorage.setItem('preferred_language', currentUserData.language);
                refreshUI();
            }
        });
    } else { currentUserData = null; refreshUI(); }
});

function triggerHardLockdown() {
    const lang = localStorage.getItem('preferred_language') || 'en';
    document.body.innerHTML = `<div style="height:100vh; background:#0C1446; color:#ff4d4d; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
        <i class="fas fa-user-slash fa-4x" style="margin-bottom:20px;"></i>
        <h1>${translations[lang].ban_title}</h1>
        <p>${translations[lang].ban_text}</p>
    </div>`;
    setTimeout(() => { signOut(auth).then(() => { window.location.href = '/LoginInToCheaplet.html'; }); }, 3000);
}

function refreshUI() {
    if (currentUserData) updateHeaderToLoggedIn(currentUserData);
    else {
        updateHeaderToLoggedOut();
        if (globalSettings.enableLanguagePrompt && !sessionStorage.getItem('lang_picked_this_session')) { 
            showLanguagePopup(); 
        }
    }
    window.applyLanguage(localStorage.getItem('preferred_language') || 'en');
    showTermsBanner();
}

function updateHeaderToLoggedIn(userData) {
    const lang = localStorage.getItem('preferred_language') || 'en';
    
    // --- 1. GLOBAL NAV LINKS (Injects on all pages) ---
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">${translations[lang].nav_browse}</a></li>
            <li><a href="/my-listings.html">${translations[lang].nav_listings}</a></li>
            <li><a href="/messages.html">${translations[lang].nav_messages}</a></li>
        `;
    }

    // --- 2. RIGHT SIDE AUTH SECTION ---
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;
    
    const name = userData.displayName || 'User';
    const photoStyle = userData.photoURL ? `background-image: url('${userData.photoURL}');` : '';
    const avatarContent = userData.photoURL ? '' : name.charAt(0).toUpperCase();

    container.innerHTML = `
        <button class="btn desktop-only" id="globalListBtn" style="margin-right: 15px;">${translations[lang].btn_list}</button>
        <a href="/messages.html" class="msg-btn-mobile"><i class="fas fa-envelope"></i></a>
        <div class="profile-menu-container">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header"><span>${name}</span></div>
                <a href="/listanitem.html" class="dropdown-item mobile-link" style="color:#2B5C92; font-weight:bold;"><i class="fas fa-plus-circle"></i> ${translations[lang].btn_list}</a>
                <a href="/search.html" class="dropdown-item mobile-link"><i class="fas fa-search"></i> ${translations[lang].nav_browse}</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link"><i class="fas fa-book"></i> ${translations[lang].nav_listings}</a>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> ${translations[lang].nav_profile}</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#ff4d4d; border-top:1px solid #eee;"><i class="fas fa-sign-out-alt"></i> ${translations[lang].btn_signout}</a>
            </div>
        </div>
    `;
    
    const listBtn = document.getElementById('globalListBtn');
    if(listBtn) listBtn.onclick = () => window.location.href = '/listanitem.html';

    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    if(avatar) avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => { if(menu) menu.classList.remove('show'); });
    
    const logoutBtn = document.getElementById('globalLogout');
    if(logoutBtn) logoutBtn.onclick = (e) => { 
        e.preventDefault();
        signOut(auth).then(() => {
            sessionStorage.clear();
            window.location.href = '/index.html';
        });
    };
}

function updateHeaderToLoggedOut() {
    const lang = localStorage.getItem('preferred_language') || 'en';
    
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `<li><a href="/search.html">${translations[lang].nav_browse}</a></li>`;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;
    container.innerHTML = `<button class="btn" onclick="window.location.href='/LoginInToCheaplet.html'">${translations[lang].btn_login}</button>`;
}

function showLanguagePopup() {
    if (document.getElementById('lang-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'lang-modal'; modal.className = 'lang-modal-overlay';
    modal.innerHTML = `
        <div class="lang-modal">
            <h2 style="color:#0C1446; margin-bottom:10px;">Welcome / Bienvenue</h2>
            <p style="color:#6b84a3; margin-bottom:20px; font-size:0.9rem;">Please select your preferred language.</p>
            <button class="lang-btn" id="btn-en">English</button>
            <button class="lang-btn" id="btn-fr">Français</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('btn-en').onclick = () => { localStorage.setItem('preferred_language', 'en'); sessionStorage.setItem('lang_picked_this_session', 'true'); location.reload(); };
    document.getElementById('btn-fr').onclick = () => { localStorage.setItem('preferred_language', 'fr'); sessionStorage.setItem('lang_picked_this_session', 'true'); location.reload(); };
}

function showTermsBanner() {
    if (localStorage.getItem('cheaplet_terms_accepted') === 'true' || document.getElementById('terms-banner-global') || document.getElementById('lang-modal')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const banner = document.createElement('div');
    banner.id = 'terms-banner-global'; banner.className = 'terms-banner';
    const text = lang === 'fr' ? 'En utilisant ce site, vous acceptez nos conditions.' : 'By using this site, you accept our terms.';
    banner.innerHTML = `<div>${text}</div><button class="btn-accept-terms" id="accept-terms-btn">ok</button>`;
    document.body.appendChild(banner);
    document.getElementById('accept-terms-btn').onclick = () => { localStorage.setItem('cheaplet_terms_accepted', 'true'); banner.remove(); };
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
