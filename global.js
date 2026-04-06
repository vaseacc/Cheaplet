import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc, setDoc, collection, query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 0. DEFERRED AUTO-IMPORT ICONS & FAVICON (Performance Optimization) ---
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'preload';
    faLink.as = 'style';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    faLink.onload = function() { this.rel = 'stylesheet'; };
    document.head.appendChild(faLink);
}
if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
    document.head.appendChild(favicon);
}

// --- 0.1 ACCESSIBILITY FIX FOR FIREBASE IFRAME ---
// Firebase Auth injects an invisible iframe that fails Lighthouse accessibility checks.
window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'IFRAME' && node.src.includes('firebaseapp.com')) {
                    node.setAttribute('title', 'Firebase Authentication Frame');
                    observer.disconnect(); // Stop observing once fixed
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Helper for deferring non-critical tasks to free up the main thread
const runWhenIdle = (cb) => {
    if (window.requestIdleCallback) requestIdleCallback(cb);
    else setTimeout(cb, 1);
};

// --- 2. TRANSLATION DICTIONARY ---
const translations = {
    "en": {
        "nav_browse": "Browse", "nav_listings": "My Listings", "nav_messages": "Messages", "nav_profile": "My Profile", "nav_hub": "Campus Hub",
        "btn_login": "Login / Register", "btn_list": "List an Item", "btn_signout": "Sign Out",
        "verified_student": "Verified Student",
        "ban_title": "ACCESS DENIED",
        "ban_text": "This account has been banned.",
        "ban_perm": "Permanent Ban",
        "ban_until": "Banned until: ",

        "tour_title_1": "Welcome to Scoralia!",
        "tour_desc_1": "Your campus marketplace for textbooks and essentials. Buy cheaply, sell quickly, and save money every semester.",
        "tour_title_2": "Trust & Safety",
        "tour_desc_2": "Look for the <span style='color:#2E7D32; font-weight:bold;'><i class='fas fa-graduation-cap'></i> Verified Student</span> badge. It means the user registered with an official college email.",
        "tour_title_3": "Smart Features",
        "tour_desc_3": "Click the bookmark icon on any listing to save it. You can easily find your saved items later in <b>My Profile</b>.",
        "tour_title_4": "Personalize Your Profile",
        "tour_desc_4": "Set your full name and a unique username (e.g., @jhondoe). Add a photo to personalize your account.",
        "tour_full_name": "Full Name (e.g., John Doe)",
        "tour_username": "Username (letters, numbers, underscore only)",
        "tour_upload": "Choose Photo",
        "tour_next": "Next",
        "tour_start": "Finish & Explore",
        "tour_saving": "Saving...",
        "tour_name_err": "Please enter a valid full name.",
        "tour_username_err": "Please enter a valid username (min 3 chars).",
        "tour_username_taken": "Username already taken. Please choose another.",
        "tour_username_available": "✓ Available",
        "tour_username_checking": "Checking...",
        "warning_title": "Admin Warning",
        "warning_btn": "I Understand",
        "contact": "Contact Us",

        "social_tour_title_1": "Welcome to the Campus Hub!",
        "social_tour_desc_1": "This is where the campus community connects. Share updates, ask questions, and engage with fellow students.",
        "social_tour_title_2": "Post & Share",
        "social_tour_desc_2": "Write what's on your mind in the composer. You can attach images and even link your marketplace listings directly to your post.",
        "social_tour_title_3": "School Feeds",
        "social_tour_desc_3": "Use the filter bar to switch between <strong>Global Campus</strong> (everyone) and <strong>My School</strong> (verified students only). To access your school feed, you need a verified email from your institution.",
        "social_tour_title_4": "Create Your Own Topic",
        "social_tour_desc_4": "Click the <strong>Create Topic</strong> button in the sidebar. Start a discussion about study groups, events, or anything relevant to your campus.",
        "social_tour_gotit": "Got it!"
    },
    "fr": {
        "nav_browse": "Parcourir", "nav_listings": "Mes Annonces", "nav_messages": "Messages", "nav_profile": "Mon Profil", "nav_hub": "Hub Campus",
        "btn_login": "Connexion", "btn_list": "Vendre", "btn_signout": "Déconnexion",
        "verified_student": "Étudiant vérifié",
        "ban_title": "ACCÈS REFUSÉ",
        "ban_text": "Ce compte a été banni.",
        "ban_perm": "Bannissement permanent",
        "ban_until": "Banni jusqu'au : ",

        "tour_title_1": "Bienvenue sur Scoralia !",
        "tour_desc_1": "Votre marché étudiant pour les manuels et articles essentiels. Achetez à bas prix, vendez rapidement et économisez.",
        "tour_title_2": "Confiance et Sécurité",
        "tour_desc_2": "Recherchez le badge <span style='color:#2E7D32; font-weight:bold;'><i class='fas fa-graduation-cap'></i> Étudiant vérifié</span>. Il indique une inscription avec un courriel scolaire officiel.",
        "tour_title_3": "Fonctionnalités",
        "tour_desc_3": "Cliquez sur l'icône de signet pour sauvegarder une annonce. Retrouvez-les facilement dans <b>Mon Profil</b>.",
        "tour_title_4": "Personnalisez votre profil",
        "tour_desc_4": "Définissez votre nom complet et un nom d'utilisateur unique (ex: @jhondoe). Ajoutez une photo pour personnaliser votre compte.",
        "tour_full_name": "Nom complet (ex: Jean Dupont)",
        "tour_username": "Nom d'utilisateur (lettres, chiffres, tiret bas)",
        "tour_upload": "Choisir une photo",
        "tour_next": "Suivant",
        "tour_start": "Terminer & Explorer",
        "tour_saving": "Enregistrement...",
        "tour_name_err": "Veuillez entrer un nom complet valide.",
        "tour_username_err": "Veuillez entrer un nom d'utilisateur valide (min 3 car.).",
        "tour_username_taken": "Nom d'utilisateur déjà pris. Veuillez en choisir un autre.",
        "tour_username_available": "✓ Disponible",
        "tour_username_checking": "Vérification...",
        "warning_title": "Avertissement de l'Administration",
        "warning_btn": "J'ai compris",
        "contact": "Nous contacter",

        "social_tour_title_1": "Bienvenue sur le Hub Campus !",
        "social_tour_desc_1": "C'est l'espace où la communauté étudiante se connecte. Partagez des nouvelles, posez des questions et interagissez avec d'autres étudiants.",
        "social_tour_title_2": "Publier et partager",
        "social_tour_desc_2": "Écrivez ce qui vous passe par la tête dans le composeur. Vous pouvez joindre des images et même lier vos annonces de marché directement à votre publication.",
        "social_tour_title_3": "Flux d'établissement",
        "social_tour_desc_3": "Utilisez le filtre pour basculer entre <strong>Campus Global</strong> (tout le monde) et <strong>Mon école</strong> (étudiants vérifiés seulement). Pour accéder au fil de votre école, vous devez avoir un email scolaire vérifié.",
        "social_tour_title_4": "Créez votre propre sujet",
        "social_tour_desc_4": "Cliquez sur le bouton <strong>Créer un sujet</strong> dans la barre latérale. Lancez une discussion sur les groupes d'étude, les événements ou tout ce qui est pertinent pour votre campus.",
        "social_tour_gotit": "Compris !"
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    const footerLinks =[
        { id: 'link-terms', key: 'terms' },
        { id: 'link-privacy', key: 'priv' },
        { id: 'link-safety', key: 'safe' },
        { id: 'link-contact', key: 'contact' }
    ];
    footerLinks.forEach(linkInfo => {
        const el = document.getElementById(linkInfo.id);
        if (el && translations[lang] && translations[lang][linkInfo.key]) {
            el.textContent = translations[lang][linkInfo.key];
        }
    });
    localStorage.setItem('preferred_language', lang);
    document.documentElement.lang = lang;
};

// --- 3. GLOBAL CSS (Optimized for Contrast Ratios) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    .header-inner, .header-content { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 15px !important; flex-direction: row !important; }
    nav { flex-grow: 1; display: flex; justify-content: center; }
    nav ul { display: flex; list-style: none; gap: 28px; padding: 0; margin: 0; align-items: center; }
    nav ul li a { color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; white-space: nowrap; }
    nav ul li a:hover { color: #FFFFFF; }
    .header-right { display: flex !important; align-items: center !important; gap: 12px !important; flex-shrink: 0 !important; flex-direction: row !important; }
    .btn { background: linear-gradient(135deg, #C8A96E 0%, #ddb97a 100%) !important; color: #0C1446 !important; border: none !important; padding: 0 18px !important; height: 38px !important; line-height: 38px !important; border-radius: 20px !important; font-weight: bold !important; cursor: pointer !important; transition: all 0.2s !important; font-size: 0.82rem !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; text-decoration: none !important; white-space: nowrap !important; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200,169,110,0.3) !important; }
    .btn:disabled { opacity: 0.7; cursor: not-allowed !important; transform: none !important; }
    .profile-menu-container { position: relative; display: flex; align-items: center; z-index: 1001; }
    .profile-avatar { width: 38px; height: 38px; border-radius: 50%; background-color: #1a2a4a; border: 2px solid #C8A96E; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; overflow: hidden; flex-shrink: 0; }
    .profile-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .dropdown-menu { position: absolute; top: 48px; right: 0; width: 260px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000; border: 1px solid #eee; }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #0C1446; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px; }
    .dropdown-header .display-name { font-weight: 700; }
    .dropdown-header .username { font-size: 0.75rem; color: #555; font-family: monospace; }
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
    .dropdown-item:hover { background-color: #f4f7fc; color: #2B5C92; }
    .msg-btn-mobile { background: #C8A96E; color: #0C1446; width: 36px; height: 36px; border-radius: 50%; display: none; align-items: center; justify-content: center; text-decoration: none; margin-right: 12px; font-size: 1rem; position: relative; }
    .badge-container { position: relative; display: inline-block; }
    .unread-badge { position: absolute; top: -6px; right: -12px; background-color: #C0392B; color: white; font-size: 0.65rem; font-weight: bold; padding: 2px 5px; border-radius: 10px; display: none; align-items: center; justify-content: center; z-index: 10; min-width: 18px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .msg-btn-mobile .unread-badge { top: -2px; right: -4px; border: 2px solid #C8A96E; }
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12,20,70,0.85); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .lang-modal { background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .lang-btn { display: block; width: 100%; padding: 16px; margin: 12px 0; border: 2px solid #EBF2FA; border-radius: 12px; background: white; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; color: #0C1446; }
    .lang-btn:hover { border-color: #C8A96E; background: #fdfaf4; }
    .tour-dot { width: 8px; height: 8px; border-radius: 50%; background: #e0e0e0; transition: 0.3s; }
    .tour-dot.active { background: #C8A96E; width: 24px; border-radius: 10px; }
    .tour-input { width: 100%; padding: 10px 12px; border: 2px solid #eee; border-radius: 8px; margin-bottom: 12px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; text-align: center; font-weight: bold; color: #0C1446; }
    .tour-input:focus { border-color: #C8A96E; }
    .tour-pfp-preview { width: 80px; height: 80px; border-radius: 50%; background: #eee; margin: 0 auto 15px; border: 3px solid #C8A96E; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #555; overflow: hidden; }
    .tour-pfp-preview img { width: 100%; height: 100%; object-fit: cover; }
    .terms-banner { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(12, 20, 70, 0.98); color: #fff; padding: 15px 25px; display: flex; justify-content: center; align-items: center; gap: 25px; z-index: 99999; font-size: 0.85rem; backdrop-filter: blur(10px); border-top: 1px solid rgba(200,169,110,0.3); }
    .btn-accept-terms { background: #C8A96E; color: #0C1446; border: none; padding: 8px 30px; border-radius: 20px; font-weight: 800; cursor: pointer; }
    .desktop-only { display: inline-flex; }
    .mobile-link { display: none; }
    
    /* Global Warning Modal Styling */
    .warning-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10050; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .warning-modal { background: #fff5f5; border: 2px solid #ef4444; border-radius: 16px; padding: 30px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(239, 68, 68, 0.2); }
    .warning-modal h2 { color: #b91c1c; font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 15px; }
    .warning-modal p { color: #7f1d1d; font-size: 1.05rem; margin-bottom: 25px; line-height: 1.5; }
    .warning-btn { background: #ef4444; color: white; border: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
    .warning-btn:hover { background: #dc2626; transform: translateY(-2px); }

    @media (max-width: 767px) {
        nav { display: none !important; }
        .msg-btn-mobile { display: flex; }
        .desktop-only { display: none !important; }
        .mobile-link { display: flex; }
        .terms-banner { flex-direction: column; text-align: center; padding-bottom: max(20px, env(safe-area-inset-bottom)); gap: 12px; }
        .lang-modal { padding: 30px 20px; }
    }
`;
document.head.appendChild(globalStyle);

// --- 3.5 PWA: Add manifest and register service worker ---
runWhenIdle(() => {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .catch(error => console.error('SW failed:', error));
        });
    }
});

// --- SCHOOL DOMAIN CHECKER ---
const schoolDomains = {
    "@etu.cegepjonquiere.ca": "Cégep de Jonquière",
    "@cegep-lanaudiere.qc.ca": "Cégep de Lanaudière",
    "@etu.cegep-lanaudiere.qc.ca": "Cégep de Lanaudière",
    "@crosemont.qc.ca": "Cégep de Rosemont",
    "@cmaisonneuve.qc.ca": "Cégep Maisonneuve",
    "@cegepmv.qc.ca": "Cégep Marie-Victorin",
    "@collegeahuntsic.qc.ca": "Collège Ahuntsic",
    "@dawsoncollege.qc.ca": "Dawson College",
    "@usherbrooke.ca": "Université de Sherbrooke",
    "@ulaval.ca": "Université Laval"
};

function getSchoolInfo(email) {
    if (!email) return { isStudent: false, schoolName: null };
    const domain = email.substring(email.lastIndexOf("@")).toLowerCase();
    return schoolDomains[domain]
        ? { isStudent: true, schoolName: schoolDomains[domain] }
        : { isStudent: false, schoolName: null };
}

// --- FUNCTION TO UPDATE USER CONTENT ---
async function updateUserContent(uid, newDisplayName) {
    if (!newDisplayName) return;
    try {
        const listingsQuery = query(collection(db, "listings"), where("posterUid", "==", uid));
        const listingsSnap = await getDocs(listingsQuery);
        const batch = writeBatch(db);
        listingsSnap.forEach(doc => { batch.update(doc.ref, { posterDisplayName: newDisplayName }); });
        await batch.commit();

        const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", uid));
        const chatsSnap = await getDocs(chatsQuery);
        const chatBatch = writeBatch(db);
        chatsSnap.forEach(doc => {
            const data = doc.data();
            const participantInfo = data.participantInfo || {};
            if (participantInfo[uid] !== newDisplayName) {
                participantInfo[uid] = newDisplayName;
                chatBatch.update(doc.ref, { participantInfo });
            }
        });
        await chatBatch.commit();
    } catch (err) { console.error("Error updating user content:", err); }
}
window.updateUserContent = updateUserContent;

// --- STATE & LISTENERS ---
let globalSettings = {};
let currentUserData = null;
let unsubscribeChats = null;

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) { globalSettings = docSnap.data(); refreshUI(); }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                
                if (currentUserData.activeWarning) {
                    showWarningPopup(currentUserData.activeWarning, user.uid);
                }

                if (currentUserData.role === 'banned') { 
                    if (currentUserData.banExpiresAt && currentUserData.banExpiresAt.toDate() < new Date()) {
                        await updateDoc(doc(db, "users", user.uid), { role: 'user', banExpiresAt: null });
                        currentUserData.role = 'user';
                    } else {
                        triggerHardLockdown(currentUserData.banExpiresAt); 
                        return; 
                    }
                }
                
                if (currentUserData.isStudent === undefined && user.email) {
                    const schoolInfo = getSchoolInfo(user.email);
                    await updateDoc(doc(db, "users", user.uid), {
                        isStudent: schoolInfo.isStudent,
                        schoolName: schoolInfo.schoolName
                    });
                    currentUserData.isStudent = schoolInfo.isStudent;
                    currentUserData.schoolName = schoolInfo.schoolName;
                }

                const storedLang = currentUserData.language;
                const localLang = localStorage.getItem('preferred_language');
                if (storedLang && translations[storedLang]) {
                    if (localLang !== storedLang) {
                        localStorage.setItem('preferred_language', storedLang);
                        window.applyLanguage(storedLang);
                    }
                } else if (localLang && translations[localLang]) {
                    await updateDoc(doc(db, "users", user.uid), { language: localLang });
                    currentUserData.language = localLang;
                }

                refreshUI();

                runWhenIdle(() => {
                    const tourKey = `scoralia_tour_seen_${user.uid}`;
                    if (!currentUserData.hasSeenTour && !localStorage.getItem(tourKey)) {
                        showWelcomeTour();
                    }
                    const socialTourKey = `scoralia_social_tour_seen_${user.uid}`;
                    if (!currentUserData.hasSeenSocialTour && !localStorage.getItem(socialTourKey)) {
                        const path = window.location.pathname;
                        if (path.includes('/social.html') || path.includes('/topic.html')) {
                            showSocialTour();
                        }
                    }
                });
            } else {
                const schoolInfo = getSchoolInfo(user.email);
                const lang = localStorage.getItem('preferred_language');
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid, 
                    displayName: user.displayName || "", 
                    email: user.email, 
                    role: 'user', 
                    isStudent: schoolInfo.isStudent,
                    schoolName: schoolInfo.schoolName,
                    language: lang || null,
                    createdAt: new Date().toISOString()
                }).catch(console.error);
            }
        });
    } else {
        currentUserData = null;
        refreshUI();
    }
});

function showWarningPopup(warningText, uid) {
    if (document.getElementById('admin-warning-modal')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const modal = document.createElement('div');
    modal.id = 'admin-warning-modal';
    modal.className = 'warning-modal-overlay';
    modal.innerHTML = `
        <div class="warning-modal">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 15px;"></i>
            <h2>${t.warning_title}</h2>
            <p>${warningText}</p>
            <button class="warning-btn" id="btn-ack-warning">${t.warning_btn}</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-ack-warning').onclick = async () => {
        modal.remove();
        await updateDoc(doc(db, "users", uid), { activeWarning: null });
    };
}

function triggerHardLockdown(expireTimestamp) {
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    let expiryText = "";
    if (expireTimestamp) {
        const date = expireTimestamp.toDate();
        const dateStr = lang === 'fr' ? date.toLocaleString('fr-CA') : date.toLocaleString('en-US');
        expiryText = `<div style="margin-top:15px; font-size:1.2rem; color:#aaa; font-weight:bold;">${t.ban_until}<br><span style="color:#FFD700;">${dateStr}</span></div>`;
    } else {
        expiryText = `<div style="margin-top:15px; font-size:1.2rem; color:#aaa; font-weight:bold; text-transform:uppercase;">${t.ban_perm}</div>`;
    }
    document.body.innerHTML = `<div style="height:100vh; background:#0C1446; color:#ff4d4d; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
        <i class="fas fa-user-slash fa-4x" style="margin-bottom:20px;"></i>
        <h1 style="font-family:'Playfair Display', serif; font-size: 3rem; margin-bottom: 10px;">${t.ban_title}</h1>
        <p style="font-size: 1.1rem; color: #ccc;">${t.ban_text}</p>
        ${expiryText}
    </div>`;
    setTimeout(() => { signOut(auth).then(() => { window.location.href = '/loginintocheaplet.html'; }); }, 5000);
}

function showWelcomeTour() {
    const user = auth.currentUser;
    if (!user) return;
    const tourKey = `scoralia_tour_seen_${user.uid}`;
    if (localStorage.getItem(tourKey) === 'true') return;
    if (currentUserData && currentUserData.hasSeenTour) { localStorage.setItem(tourKey, 'true'); return; }
    if (document.querySelector('.lang-modal-overlay')) return;

    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const defaultPfpUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}&backgroundColor=EBF2FA`;
    const existingFullName = currentUserData?.displayName || '';
    const existingUsername = currentUserData?.username || '';

    const overlay = document.createElement('div');
    overlay.className = 'lang-modal-overlay';
    overlay.style.zIndex = '10005';
    overlay.innerHTML = `
        <div class="lang-modal" style="padding: 40px 30px;">
            <div id="tour-step-1">
                <i class="fas fa-handshake fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_1}</h2>
                <p style="color:#476483; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_1}</p>
                <button class="btn" id="tour-btn-1" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="tour-step-2" style="display:none;">
                <i class="fas fa-shield-alt fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_2}</h2>
                <p style="color:#476483; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_2}</p>
                <button class="btn" id="tour-btn-2" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="tour-step-3" style="display:none;">
                <i class="fas fa-bookmark fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_3}</h2>
                <p style="color:#476483; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_3}</p>
                <button class="btn" id="tour-btn-3" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="tour-step-4" style="display:none;">
                <div class="tour-pfp-preview" id="tour-pfp-box"><img src="${defaultPfpUrl}"></div>
                <h2 style="color:#0C1446; margin-bottom:10px; font-family:'Playfair Display', serif;">${t.tour_title_4}</h2>
                <p style="color:#476483; margin-bottom:15px; line-height:1.4; font-size:0.85rem;">${t.tour_desc_4}</p>
                
                <input type="text" id="tour-fullname" class="tour-input" value="${existingFullName}" placeholder="${t.tour_full_name}">
                <input type="text" id="tour-username" class="tour-input" value="${existingUsername}" placeholder="${t.tour_username}">
                <div id="tour-username-status" style="font-size:0.75rem; text-align:center; margin-bottom:10px;"></div>
                
                <input type="file" id="tour-file-input" accept="image/*" style="display:none;">
                <label for="tour-file-input" style="display:block; cursor:pointer; color:#2B5C92; font-weight:bold; margin-bottom:20px; text-decoration:underline;">
                    <i class="fas fa-camera"></i> ${t.tour_upload}
                </label>
                
                <div id="tour-final-error" style="color:#d32f2f; font-size:0.85rem; margin-bottom:10px; display:none; text-align:center; font-weight:bold; border: 1px solid #ffcdd2; background: #fef2f2; padding: 8px; border-radius: 6px;"></div>

                <button class="btn" id="tour-btn-4" style="width:100%;">${t.tour_start}</button>
            </div>
            <div style="display:flex; justify-content:center; gap:8px; margin-top:25px;" id="tour-dots">
                <div class="tour-dot active" id="dot-1"></div><div class="tour-dot" id="dot-2"></div>
                <div class="tour-dot" id="dot-3"></div><div class="tour-dot" id="dot-4"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('tour-btn-1').onclick = () => {
        document.getElementById('tour-step-1').style.display = 'none'; document.getElementById('tour-step-2').style.display = 'block';
        document.getElementById('dot-1').classList.remove('active'); document.getElementById('dot-2').classList.add('active');
    };
    document.getElementById('tour-btn-2').onclick = () => {
        document.getElementById('tour-step-2').style.display = 'none'; document.getElementById('tour-step-3').style.display = 'block';
        document.getElementById('dot-2').classList.remove('active'); document.getElementById('dot-3').classList.add('active');
    };
    document.getElementById('tour-btn-3').onclick = () => {
        document.getElementById('tour-step-3').style.display = 'none'; document.getElementById('tour-step-4').style.display = 'block';
        document.getElementById('dot-3').classList.remove('active'); document.getElementById('dot-4').classList.add('active');
    };

    const usernameInput = overlay.querySelector('#tour-username');
    const nameInput = overlay.querySelector('#tour-fullname');
    const usernameStatus = overlay.querySelector('#tour-username-status');
    const finalError = overlay.querySelector('#tour-final-error');

    let usernameTimeout = null;
    let isUsernameValid = false;

    nameInput.addEventListener('input', () => {
        finalError.style.display = 'none';
        nameInput.style.borderColor = '#eee';
    });
    
    usernameInput.addEventListener('input', () => {
        finalError.style.display = 'none';
        usernameInput.style.borderColor = '#eee';
        
        if (usernameTimeout) clearTimeout(usernameTimeout);
        const val = usernameInput.value.trim();
        if (!val) { usernameStatus.textContent = ''; isUsernameValid = false; return; }
        usernameTimeout = setTimeout(() => checkUsernameAvailability(val), 500);
    });

    function validateUsernameFormat(username) { return /^[a-zA-Z0-9_]{3,}$/.test(username); }

    async function checkUsernameAvailability(username) {
        if (!validateUsernameFormat(username)) {
            usernameStatus.textContent = t.tour_username_err; usernameStatus.style.color = '#d32f2f';
            isUsernameValid = false; return false;
        }
        usernameStatus.textContent = t.tour_username_checking; usernameStatus.style.color = '#ff9800';
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const snap = await getDocs(q);
        if (snap.empty) {
            usernameStatus.textContent = t.tour_username_available; usernameStatus.style.color = '#2E7D32';
            isUsernameValid = true; return true;
        } else {
            usernameStatus.textContent = t.tour_username_taken; usernameStatus.style.color = '#d32f2f';
            isUsernameValid = false; return false;
        }
    }

    if (existingUsername) { setTimeout(() => checkUsernameAvailability(existingUsername), 100); }

    let selectedFile = null;
    const fileInput = overlay.querySelector('#tour-file-input');
    fileInput.onchange = (e) => {
        if (e.target.files[0]) {
            selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => { overlay.querySelector('#tour-pfp-box').innerHTML = `<img src="${ev.target.result}">`; };
            reader.readAsDataURL(selectedFile);
        }
    };

    const finishBtn = overlay.querySelector('#tour-btn-4');
    finishBtn.onclick = async () => {
        finalError.style.display = 'none'; 

        const fullname = nameInput.value.trim();
        const username = usernameInput.value.trim().toLowerCase();
        
        if (!fullname) {
            finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t.tour_name_err}`;
            finalError.style.display = 'block';
            nameInput.style.borderColor = '#d32f2f';
            return;
        }

        if (!username || !validateUsernameFormat(username)) {
            finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t.tour_username_err}`;
            finalError.style.display = 'block';
            usernameInput.style.borderColor = '#d32f2f';
            return;
        }

        if (!isUsernameValid) {
            const available = await checkUsernameAvailability(username);
            if (!available) {
                finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t.tour_username_taken}`;
                finalError.style.display = 'block';
                usernameInput.style.borderColor = '#d32f2f';
                return;
            }
        }
        
        finishBtn.disabled = true; finishBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.tour_saving}`;

        let finalPhoto = defaultPfpUrl;
        if (selectedFile) {
            try {
                const signRes = await fetch('/.netlify/functions/sign-upload').then(r => r.json());
                const formData = new FormData();
                formData.append('file', selectedFile); formData.append('api_key', signRes.apiKey);
                formData.append('timestamp', signRes.timestamp); formData.append('signature', signRes.signature);
                formData.append('upload_preset', signRes.uploadPreset);
                const res = await fetch(`https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`, { method: 'POST', body: formData }).then(r => r.json());
                if (res.secure_url) finalPhoto = res.secure_url;
            } catch (err) { console.error(err); }
        }

        try {
            const oldDisplayName = currentUserData?.displayName || '';
            await updateProfile(user, { displayName: fullname, photoURL: finalPhoto });
            await updateDoc(doc(db, "users", user.uid), { displayName: fullname, username: username, photoURL: finalPhoto, hasSeenTour: true });
            if (fullname !== oldDisplayName) await updateUserContent(user.uid, fullname);
            localStorage.setItem(tourKey, 'true');
            overlay.remove(); refreshUI();
        } catch (err) {
            console.error(err); 
            finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error saving profile. Please try again.`;
            finalError.style.display = 'block';
            finishBtn.disabled = false; finishBtn.textContent = t.tour_start;
        }
    };
}

window.showSocialTour = () => {
    const user = auth.currentUser;
    if (!user) return;
    const socialTourKey = `scoralia_social_tour_seen_${user.uid}`;
    if (localStorage.getItem(socialTourKey) === 'true') return;
    if (currentUserData && currentUserData.hasSeenSocialTour) { localStorage.setItem(socialTourKey, 'true'); return; }
    if (document.querySelector('.lang-modal-overlay')) return;

    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];

    const overlay = document.createElement('div');
    overlay.className = 'lang-modal-overlay';
    overlay.style.zIndex = '10006';
    overlay.innerHTML = `
        <div class="lang-modal" style="padding: 30px 25px;">
            <div id="social-tour-step-1">
                <i class="fas fa-users fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_1}</h2>
                <p style="color:#476483; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_1}</p>
                <button class="btn" id="social-tour-btn-1" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-2" style="display:none;">
                <i class="fas fa-edit fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_2}</h2>
                <p style="color:#476483; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_2}</p>
                <button class="btn" id="social-tour-btn-2" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-3" style="display:none;">
                <i class="fas fa-filter fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_3}</h2>
                <p style="color:#476483; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_3}</p>
                <button class="btn" id="social-tour-btn-3" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-4" style="display:none;">
                <i class="fas fa-plus-circle fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_4}</h2>
                <p style="color:#476483; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_4}</p>
                <button class="btn" id="social-tour-btn-4" style="width:100%;">${t.social_tour_gotit}</button>
            </div>
            <div style="display:flex; justify-content:center; gap:8px; margin-top:25px;" id="social-tour-dots">
                <div class="tour-dot active" id="social-dot-1"></div><div class="tour-dot" id="social-dot-2"></div>
                <div class="tour-dot" id="social-dot-3"></div><div class="tour-dot" id="social-dot-4"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('social-tour-btn-1').onclick = () => {
        document.getElementById('social-tour-step-1').style.display = 'none';
        document.getElementById('social-tour-step-2').style.display = 'block';
        document.getElementById('social-dot-1').classList.remove('active');
        document.getElementById('social-dot-2').classList.add('active');
    };
    document.getElementById('social-tour-btn-2').onclick = () => {
        document.getElementById('social-tour-step-2').style.display = 'none';
        document.getElementById('social-tour-step-3').style.display = 'block';
        document.getElementById('social-dot-2').classList.remove('active');
        document.getElementById('social-dot-3').classList.add('active');
    };
    document.getElementById('social-tour-btn-3').onclick = () => {
        document.getElementById('social-tour-step-3').style.display = 'none';
        document.getElementById('social-tour-step-4').style.display = 'block';
        document.getElementById('social-dot-3').classList.remove('active');
        document.getElementById('social-dot-4').classList.add('active');
    };
    document.getElementById('social-tour-btn-4').onclick = async () => {
        await updateDoc(doc(db, "users", user.uid), { hasSeenSocialTour: true });
        localStorage.setItem(socialTourKey, 'true');
        overlay.remove();
    };
};

function refreshUI() {
    if (currentUserData) { updateHeaderToLoggedIn(currentUserData); } 
    else { updateHeaderToLoggedOut(); }
    
    runWhenIdle(() => {
        const langSelected = localStorage.getItem('preferred_language');
        if (!langSelected && !document.getElementById('lang-banner-global')) {
            showLanguageBanner();
        }
        window.applyLanguage(langSelected || 'en');
        showTermsBanner();
    });
}

function listenToUnreadMessages(uid) {
    if (unsubscribeChats) unsubscribeChats();
    const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
    unsubscribeChats = onSnapshot(q, (snapshot) => {
        let unreadCount = 0;
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (!d.lastMessage || d.lastMessage.trim() === "") return;
            if (d.unreadBy && d.unreadBy.includes(uid)) unreadCount++;
        });
        const deskBadge = document.getElementById('desktop-unread-badge');
        const mobBadge = document.getElementById('mobile-unread-badge');
        if (unreadCount > 0) {
            if (deskBadge) { deskBadge.textContent = unreadCount; deskBadge.style.display = 'flex'; }
            if (mobBadge) { mobBadge.textContent = unreadCount; mobBadge.style.display = 'flex'; }
        } else {
            if (deskBadge) deskBadge.style.display = 'none';
            if (mobBadge) mobBadge.style.display = 'none';
        }
    });
}

function updateHeaderToLoggedIn(userData) {
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">${t.nav_browse}</a></li>
            <li><a href="/my-listings.html">${t.nav_listings}</a></li>
            <li><a href="/social.html">${t.nav_hub}</a></li>
            <li><a href="/messages.html" class="badge-container">${t.nav_messages}<span class="unread-badge" id="desktop-unread-badge"></span></a></li>
        `;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    const name = userData.displayName || 'User';
    const username = userData.username ? `@${userData.username}` : '';
    let finalPhotoURL = userData.photoURL;
    if (!finalPhotoURL || finalPhotoURL.includes("googleusercontent.com") || finalPhotoURL.includes("live.com")) {
        finalPhotoURL = `https://api.dicebear.com/7.x/identicon/svg?seed=${userData.uid}&backgroundColor=EBF2FA`;
    }

    container.innerHTML = `
        <button class="btn desktop-only" id="globalListBtn" style="margin-right: 15px;">${t.btn_list}</button>
        <a href="/messages.html" class="msg-btn-mobile"><i class="fas fa-envelope"></i><span class="unread-badge" id="mobile-unread-badge"></span></a>
        <div class="profile-menu-container">
            <div class="profile-avatar"><img src="${finalPhotoURL}" alt="Profile"></div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">
                    <div class="display-name">${name}</div>
                    ${username ? `<div class="username">${username}</div>` : ''}
                </div>
                <a href="/listanitem.html" class="dropdown-item mobile-link" style="color:#2B5C92; font-weight:bold;"><i class="fas fa-plus-circle"></i> ${t.btn_list}</a>
                <a href="/search.html" class="dropdown-item mobile-link"><i class="fas fa-search"></i> ${t.nav_browse}</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link"><i class="fas fa-book"></i> ${t.nav_listings}</a>
                <a href="/social.html" class="dropdown-item mobile-link"><i class="fas fa-users"></i> ${t.nav_hub}</a>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> ${t.nav_profile}</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#ff4d4d; border-top:1px solid #eee;"><i class="fas fa-sign-out-alt"></i> ${t.btn_signout}</a>
            </div>
        </div>
    `;

    const listBtn = document.getElementById('globalListBtn');
    if (listBtn) listBtn.onclick = () => window.location.href = '/listanitem.html';

    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    if (avatar) avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => { if (menu) menu.classList.remove('show'); });

    const logoutBtn = document.getElementById('globalLogout');
    if (logoutBtn) logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => { sessionStorage.clear(); window.location.href = '/index.html'; });
    };

    listenToUnreadMessages(userData.uid);
}

function updateHeaderToLoggedOut() {
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">${t.nav_browse}</a></li>
            <li><a href="/social.html">${t.nav_hub}</a></li>
        `;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;
    container.innerHTML = `<button class="btn" onclick="window.location.href='/LoginInToCheaplet.html'">${t.btn_login}</button>`;
}

function showLanguageBanner() {
    if (document.getElementById('lang-banner-global')) return;
    const banner = document.createElement('div');
    banner.id = 'lang-banner-global'; 
    banner.className = 'terms-banner';
    banner.style.zIndex = '100000';
    banner.innerHTML = `
        <div>Choose your language / Choisissez votre langue :</div>
        <div style="display: flex; gap: 15px;">
            <button class="btn-accept-terms" id="btn-en">English</button>
            <button class="btn-accept-terms" id="btn-fr">Français</button>
        </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('btn-en').onclick = () => {
        localStorage.setItem('preferred_language', 'en');
        location.reload();
    };
    document.getElementById('btn-fr').onclick = () => {
        localStorage.setItem('preferred_language', 'fr');
        location.reload();
    };
}

function showTermsBanner() {
    if (localStorage.getItem('scoralia_terms_accepted') === 'true' || document.getElementById('terms-banner-global') || document.getElementById('lang-banner-global')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const banner = document.createElement('div');
    banner.id = 'terms-banner-global'; banner.className = 'terms-banner';
    const text = lang === 'fr' ? 'En utilisant ce site, vous acceptez nos conditions.' : 'By using this site, you accept our terms.';
    banner.innerHTML = `<div>${text}</div><button class="btn-accept-terms" id="accept-terms-btn">ok</button>`;
    document.body.appendChild(banner);
    document.getElementById('accept-terms-btn').onclick = () => { localStorage.setItem('scoralia_terms_accepted', 'true'); banner.remove(); };
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
--- END OF FILE Paste April 06, 2026 - 5:39PM ---
