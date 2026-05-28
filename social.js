// social.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, limit, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";

async function main() {
    const response = await fetch(getFunctionUrl('config'));
    const config = await response.json();
    const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // --- UI STRINGS ---
    const lang = localStorage.getItem('preferred_language') || 'en';
    const allStrings = {
        en: { 
            topics_public: "Public Channels", 
            topics_campus: "Global Campus", 
            topics_custom: "Custom Topics", 
            topics_new: "Create Topic",
            post_placeholder: "What's happening on Global Campus?", 
            loading_hub: "Loading campus hub...",
            noPosts: "No posts yet. Be the first to share something!", 
            justNow: "Just now", 
            suggest: "Campus Marketplace", 
            browse: "Browse All →", 
            guest: "Campus Hub", 
            sell: "List a Book", 
            comment_placeholder: "Write a comment...", 
            no_comments: "No comments yet.",
            lock_title: "Restricted Access", 
            lock_desc: "The Campus Hub is an exclusive space for students. Please log in to join the conversation.", 
            lock_btn: "Log In or Register",
            rep_title: "Report Post", 
            rep_desc: "Help us keep Scoralia safe.", 
            rep_place: "Details...", 
            rep_cancel: "Cancel", 
            rep_submit: "Submit", 
            rep_success: "Report submitted.",
            attach_title: "Attach a Listing", 
            attach_desc: "Select one of your active listings to share.", 
            attach_empty: "You have no active listings.", 
            upload_fail: "Image upload failed.",
            search_social_place: "Search posts, topics, people...", 
            edit_post_title: "Edit Post", 
            save_changes: "Save Changes", 
            edited_label: " • Edited",
            my_topics: "My Topics", 
            saved_topics: "Saved Topics", 
            discover_topics: "Discover", 
            topics_directory: "Topics Directory",
            verify_banner_text: "Get the Verified Student badge to filter posts by your school – create an account with your school email address.",
            restricted_title: "Verified Student Required",
            restricted_desc: "To post in a specific school's feed, you need a verified student account with a school email address.",
            restricted_btn: "Create School Account",
            filter_my_school: "My School",
            filter_all_posts: "All Posts",
            safetyCheck: "Checking...", 
            imgRejected: "Image rejected: ",
            dialog_confirm: "Confirm", 
            dialog_delete_post: "Are you sure you want to delete this post?", 
            dialog_delete_comment: "Delete this comment?",
            btn_yes: "Yes", 
            btn_no: "No", 
            btn_delete: "Delete", 
            btn_ok: "OK", 
            alert_title: "Notice",
            private_feed_locked: "Private Campus Feed",
            private_feed_desc: "This feed is securely locked to protect student privacy. Only verified students from",
            login_prompt_title: "Join the Campus Hub",
            login_prompt_desc: "Create an account or log in to post, comment, and interact with your campus community.",
            login_prompt_login: "Log In",
            login_prompt_register: "Register",
            login_prompt_dismiss: "Continue without logging in"
        },
        fr: { 
            topics_public: "Canaux Publics", 
            topics_campus: "Campus Global", 
            topics_custom: "Sujets Personnalisés", 
            topics_new: "Nouveau Sujet",
            post_placeholder: "Que se passe-t-il sur le Campus Global ?", 
            loading_hub: "Chargement du hub...",
            noPosts: "Aucune publication. Soyez le premier à partager !", 
            justNow: "À l'instant", 
            suggest: "Marché du Campus", 
            browse: "Voir tout →", 
            guest: "Hub Campus", 
            sell: "Vendre un livre", 
            comment_placeholder: "Écrire un commentaire...", 
            no_comments: "Aucun commentaire pour le moment.",
            lock_title: "Accès Restreint", 
            lock_desc: "Le Hub Campus est un espace exclusif pour les étudiants. Connectez-vous pour rejoindre la conversation.", 
            lock_btn: "Se Connecter ou S'inscrire",
            rep_title: "Signaler le message", 
            rep_desc: "Aidez-nous à protéger Scoralia.", 
            rep_place: "Détails...", 
            rep_cancel: "Annuler", 
            rep_submit: "Envoyer", 
            rep_success: "Signalement envoyé.",
            attach_title: "Joindre une annonce", 
            attach_desc: "Sélectionnez l'une de vos annonces actives.", 
            attach_empty: "Vous n'avez aucune annonce active.", 
            upload_fail: "Échec du téléchargement.",
            search_social_place: "Rechercher messages, sujets, personnes...", 
            edit_post_title: "Modifier le message", 
            save_changes: "Enregistrer", 
            edited_label: " • Modifié",
            my_topics: "Mes Sujets", 
            saved_topics: "Sujets Enregistrés", 
            discover_topics: "Découvrir", 
            topics_directory: "Annuaire des Sujets",
            verify_banner_text: "Obtenez le badge « Étudiant vérifié » et filtrez les messages par votre établissement – créez un compte avec votre adresse e-mail scolaire.",
            restricted_title: "Compte étudiant requis",
            restricted_desc: "Pour publier dans le fil d'une école spécifique, vous avez besoin d'un compte étudiant vérifié avec une adresse e-mail scolaire.",
            restricted_btn: "Créer un compte scolaire",
            filter_my_school: "Mon école",
            filter_all_posts: "Tous les messages",
            safetyCheck: "Vérification...", 
            imgRejected: "Image rejetée : ",
            dialog_confirm: "Confirmer", 
            dialog_delete_post: "Êtes-vous sûr de vouloir supprimer ce message ?", 
            dialog_delete_comment: "Supprimer ce commentaire ?",
            btn_yes: "Oui", 
            btn_no: "Non", 
            btn_delete: "Supprimer", 
            btn_ok: "OK", 
            alert_title: "Avis",
            private_feed_locked: "Fil d'actualité privé",
            private_feed_desc: "Ce fil est verrouillé pour protéger la vie privée des étudiants. Seuls les étudiants vérifiés de",
            login_prompt_title: "Rejoindre le Campus Hub",
            login_prompt_desc: "Créez un compte ou connectez-vous pour publier, commenter et interagir avec votre communauté.",
            login_prompt_login: "Se connecter",
            login_prompt_register: "S'inscrire",
            login_prompt_dismiss: "Continuer sans se connecter"
        }
    };
    const ui = allStrings[lang] || allStrings['en'];

    // --- CUSTOM DIALOGS SYSTEM ---
    const dialogOverlay = document.getElementById('custom-dialog-modal');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogCancel = document.getElementById('dialog-cancel');
    const dialogConfirm = document.getElementById('dialog-confirm');

    window.scoraliaConfirm = (message, title = ui.dialog_confirm) => {
        return new Promise((resolve) => {
            dialogTitle.textContent = title;
            dialogMessage.textContent = message;
            dialogCancel.style.display = 'block';
            dialogCancel.textContent = ui.btn_no;
            dialogConfirm.textContent = ui.btn_yes;
            dialogConfirm.className = "btn btn-danger";
            dialogOverlay.style.display = 'flex';

            const cleanup = (val) => {
                dialogOverlay.style.display = 'none';
                dialogConfirm.onclick = null;
                dialogCancel.onclick = null;
                resolve(val);
            };

            dialogConfirm.onclick = () => cleanup(true);
            dialogCancel.onclick = () => cleanup(false);
        });
    };

    window.scoraliaAlert = (message, title = ui.alert_title) => {
        return new Promise((resolve) => {
            dialogTitle.textContent = title;
            dialogMessage.textContent = message;
            dialogCancel.style.display = 'none';
            dialogConfirm.textContent = ui.btn_ok;
            dialogConfirm.className = "btn btn-action";
            dialogConfirm.style.background = "var(--gold)";
            dialogOverlay.style.display = 'flex';

            dialogConfirm.onclick = () => {
                dialogOverlay.style.display = 'none';
                resolve();
            };
        });
    };

    // Global language safety check
    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    document.querySelectorAll('[data-i18n]').forEach(el => { 
        if (ui[el.getAttribute('data-i18n')]) {
            el.textContent = ui[el.getAttribute('data-i18n')]; 
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { 
        if (ui[el.getAttribute('data-i18n-placeholder')]) {
            el.placeholder = ui[el.getAttribute('data-i18n-placeholder')]; 
        }
    });
    
    setElemText('ui-locked-title', ui.lock_title);
    setElemText('ui-locked-desc', ui.lock_desc);
    
    const elLockedBtn = document.getElementById('ui-locked-btn');
    if (elLockedBtn) { 
        elLockedBtn.textContent = ui.lock_btn; 
        elLockedBtn.href = `/login`; 
    }

    setElemText('report-modal-title', ui.rep_title);
    setElemText('report-modal-desc', ui.rep_desc);
    
    const elRepDetails = document.getElementById('report-details');
    if (elRepDetails) {
        elRepDetails.placeholder = ui.rep_place;
    }
    
    setElemText('btn-cancel-report', ui.rep_cancel);
    setElemText('btn-submit-report', ui.rep_submit);

    setElemText('ui-modal-attach-title', ui.attach_title);
    setElemText('ui-modal-attach-desc', ui.attach_desc);
    setElemText('verify-banner-text', ui.verify_banner_text);

    const restrictedModal = document.getElementById('restricted-modal');
    const closeRestrictedBtn = document.getElementById('close-restricted-btn');
    
    if (closeRestrictedBtn) {
        closeRestrictedBtn.onclick = () => { 
            if (restrictedModal) {
                restrictedModal.style.display = 'none'; 
            }
        };
    }

    // --- BOTTOM SHEET LOGIC ---
    const sheetOverlay = document.getElementById('sheet-overlay');
    const bottomSheet = document.getElementById('bottom-sheet');
    const btnOpenMenu = document.getElementById('m-btn-open-menu');
    const btnCloseSheet = document.getElementById('close-sheet-btn');

    if (btnOpenMenu) {
        btnOpenMenu.onclick = () => {
            if (sheetOverlay) {
                sheetOverlay.style.display = 'block';
                void sheetOverlay.offsetWidth; // Trigger reflow
                sheetOverlay.style.opacity = '1';
            }
            if (bottomSheet) {
                bottomSheet.style.transform = 'translateY(0)';
            }
        };
    }

    const closeSheet = () => {
        if (sheetOverlay) {
            sheetOverlay.style.opacity = '0';
            setTimeout(() => { 
                sheetOverlay.style.display = 'none'; 
            }, 300);
        }
        if (bottomSheet) {
            bottomSheet.style.transform = 'translateY(100%)';
        }
    };

    if (btnCloseSheet) {
        btnCloseSheet.onclick = closeSheet;
    }
    if (sheetOverlay) {
        sheetOverlay.onclick = closeSheet;
    }

    // --- SEARCH BAR LOGIC ---
    const socialSearchInput = document.getElementById('social-search-input');
    const btnSocialSearch = document.getElementById('btn-social-search');

    function executeSocialSearch() {
        const q = socialSearchInput.value.trim();
        if(q) {
            window.location.href = `/searchsocial?q=${encodeURIComponent(q)}`;
        }
    }
    
    if (btnSocialSearch) {
        btnSocialSearch.onclick = executeSocialSearch;
    }
    
    if (socialSearchInput) {
        socialSearchInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') { 
                e.preventDefault(); 
                executeSocialSearch(); 
            }
        });
    }

    function formatCount(num) { 
        return !num ? 0 : (num > 999 ? (num / 1000).toFixed(1) + 'k' : num); 
    }

    // ─── HELPER: generate a safe Firestore collection name from a school name ───
    function getSchoolCollection(schoolName) {
        if (!schoolName || schoolName === 'Global Campus') {
            return 'social_posts_global';
        }
        
        if (schoolName === 'Cégep de Rosemont' || schoolName === 'Collège de Rosemont') {
            return 'social_posts_rosemont';
        }
        if (schoolName === 'Vanier College') {
            return 'social_posts_vanier';
        }

        const key = schoolName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Strips accents
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
            
        return `social_posts_${key}`;
    }

    let currentUser = null;
    let currentUserData = null;
    let internalSchoolName = "Global Campus"; 
    let targetSchool = "Global Campus"; 
    let unsubscribePosts = null;
    let commentUnsubscribes = {}; 
    let listings = []; 
    let allTopicsData = [];

    // --- COMPOSER STATE ---
    let postImageFile = null;
    let postAttachedListing = null;
    let activeCommentPostId = null;
    let commentImageFiles = {}; 

    const dSchoolName = document.getElementById('d-user-school');
    const mobileWaysList = document.getElementById('mobile-ways-list');
    const feedContainer = document.getElementById('feed-container');
    
    const postInput = document.getElementById('post-input');
    const btnSendPost = document.getElementById('btn-send-post');
    const previewArea = document.getElementById('composer-preview-area');
    const btnAttachImg = document.getElementById('btn-attach-img');
    const btnAttachListing = document.getElementById('btn-attach-listing');
    const imgUploadInput = document.getElementById('post-img-upload');
    const attachListingModal = document.getElementById('attach-listing-modal');
    const listingSelectorList = document.getElementById('listing-selector-list');

    const filterBar = document.getElementById('filter-bar');
    const verifyBanner = document.getElementById('verify-banner');
    const allFilterBtn = document.getElementById('all-filter-btn');
    const myFilterBtn = document.getElementById('my-school-filter');
    let currentSchoolFilter = 'all'; 

    // Login prompt
    const loginPromptModal = document.getElementById('login-prompt-modal');
    const btnDismissPrompt = document.getElementById('btn-dismiss-prompt');

    // Set translated texts
    setElemText('login-prompt-title', ui.login_prompt_title);
    setElemText('login-prompt-desc', ui.login_prompt_desc);
    setElemText('btn-login-prompt', ui.login_prompt_login);
    setElemText('btn-register-prompt', ui.login_prompt_register);
    setElemText('btn-dismiss-prompt', ui.login_prompt_dismiss);

    // Show prompt for guests
    function maybeShowLoginPrompt() {
        if (!currentUser && !sessionStorage.getItem('login_prompt_dismissed')) {
            loginPromptModal.style.display = 'flex';
        }
    }

    if (btnDismissPrompt) {
        btnDismissPrompt.onclick = () => {
            loginPromptModal.style.display = 'none';
            sessionStorage.setItem('login_prompt_dismissed', 'true');
        };
    }

    function requireLogin() {
        if (!currentUser) {
            if (loginPromptModal) loginPromptModal.style.display = 'flex';
            return false;
        }
        return true;
    }

    const btnCreateWay = document.getElementById('btn-create-way');
    if (btnCreateWay) {
        btnCreateWay.onclick = (e) => {
            e.preventDefault();
            if (!currentUser) {
                window.location.href = '/login?redirect=/social';
            } else {
                window.location.href = '/createtopic';
            }
        };
    }

    const mSheetCreateWay = document.getElementById('m-sheet-create-way');
    if (mSheetCreateWay) {
        mSheetCreateWay.onclick = (e) => {
            e.preventDefault();
            if (!currentUser) {
                window.location.href = '/login?redirect=/social';
            } else {
                window.location.href = '/createtopic';
            }
        };
    }

    // --- FETCH MARKET LISTINGS ---
    async function fetchMarketListings() {
        if (!currentUser) return;
        const isAdmin = currentUserData?.role === 'admin';
        const userSchool = internalSchoolName || targetSchool || "Collège de Rosemont";
        
        let bookQuery = query(
            collection(db, "listings"),
            where("status", "==", "active"),
            orderBy("timestamp", "desc"),
            limit(6)
        );

        if (!isAdmin && userSchool !== "Global Campus") {
            try {
                const schoolQuery = query(
                    collection(db, "listings"),
                    where("location", "==", userSchool),
                    where("status", "==", "active"),
                    orderBy("timestamp", "desc"),
                    limit(6)
                );
                const snap = await getDocs(schoolQuery);
                if (!snap.empty) {
                    listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    return;
                }
            } catch (e) {
                console.warn("School-specific listings failed, fallback to global", e);
            }
        }

        try {
            const snap = await getDocs(bookQuery);
            listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error("Failed to fetch market listings", e);
            listings = [];
        }
    }

    // --- COMPOSER LOGIC ---
    function updateComposerSendButton() {
        if (!postInput) return;
        const hasContent = postInput.value.trim().length > 0 || postImageFile !== null || postAttachedListing !== null;
        if (btnSendPost) {
            btnSendPost.style.opacity = hasContent ? '1' : '0.5';
            btnSendPost.disabled = false; // The Send button is ALWAYS clickable (no disabled attribute)
        }
    }

    if (postInput) {
        postInput.addEventListener('input', function() {
            this.style.height = '40px';
            this.style.height = (this.scrollHeight) + 'px';
            updateComposerSendButton();
        });
    }

    function renderComposerPreview() {
        if (!previewArea) return;
        previewArea.innerHTML = '';
        let hasContent = false;

        if (postImageFile) {
            hasContent = true;
            const wrap = document.createElement('div');
            wrap.className = 'preview-img-wrap';
            wrap.innerHTML = `
                <img src="${URL.createObjectURL(postImageFile)}">
                <button class="remove-preview-btn" onclick="window.removePostImg()">&times;</button>
            `;
            previewArea.appendChild(wrap);
        }

        if (postAttachedListing) {
            hasContent = true;
            const wrap = document.createElement('div');
            wrap.className = 'preview-listing-wrap';
            wrap.innerHTML = `
                <img src="${postAttachedListing.img}" class="preview-listing-img">
                <div class="preview-listing-info">
                    <div class="preview-listing-title">${postAttachedListing.title}</div>
                    <div class="preview-listing-price">$${postAttachedListing.price}</div>
                </div>
                <button class="remove-preview-btn" onclick="window.removePostListing()">&times;</button>
            `;
            previewArea.appendChild(wrap);
        }

        previewArea.style.display = hasContent ? 'flex' : 'none';
        updateComposerSendButton();
    }

    window.removePostImg = () => { 
        postImageFile = null; 
        renderComposerPreview(); 
    };
    
    window.removePostListing = () => { 
        postAttachedListing = null; 
        renderComposerPreview(); 
    };

    if (btnAttachImg) {
        btnAttachImg.onclick = () => { 
            if (!requireLogin()) return;
            if(imgUploadInput) {
                imgUploadInput.click(); 
            }
        };
    }
    
    if (imgUploadInput) {
        imgUploadInput.onchange = (e) => {
            if (e.target.files[0]) {
                postImageFile = e.target.files[0];
                renderComposerPreview();
            }
            e.target.value = '';
        };
    }

    if (btnAttachListing) {
        btnAttachListing.onclick = async () => {
            if (!requireLogin()) return;
            if (!attachListingModal || !listingSelectorList) return;
            
            attachListingModal.style.display = 'flex';
            listingSelectorList.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';
            
            try {
                const q = query(
                    collection(db, "listings"), 
                    where("posterUid", "==", currentUser.uid), 
                    where("status", "==", "active"), 
                    orderBy("timestamp", "desc")
                );
                const snap = await getDocs(q);
                listingSelectorList.innerHTML = '';
                
                if (snap.empty) {
                    listingSelectorList.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">${ui.attach_empty}</div>`;
                    return;
                }

                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    const item = document.createElement('div');
                    item.className = 'listing-selector-item';
                    const img = d.imageUrls?.[0] || '';
                    item.innerHTML = `
                        <img src="${img}" class="ls-img">
                        <div class="ls-info">
                            <div class="ls-title">${d.title}</div>
                            <div class="ls-price">$${d.price.toFixed(2)}</div>
                        </div>
                    `;
                    item.onclick = () => {
                        postAttachedListing = { 
                            id: docSnap.id, 
                            title: d.title, 
                            price: d.price.toFixed(2), 
                            img: img 
                        };
                        attachListingModal.style.display = 'none';
                        renderComposerPreview();
                    };
                    listingSelectorList.appendChild(item);
                });
            } catch(e) {
                console.error(e);
                listingSelectorList.innerHTML = '<div style="text-align:center; padding:20px; color:#e53e3e;">Error loading listings.</div>';
            }
        };
    }

    const closeListingModalBtn = document.getElementById('close-listing-modal');
    if (closeListingModalBtn && attachListingModal) {
        closeListingModalBtn.onclick = () => { 
            attachListingModal.style.display = 'none'; 
        };
    }

    async function uploadImageToCloudinary(file) {
        const signRes = await fetch(getFunctionUrl('sign-upload')).then(r => r.json());
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signRes.apiKey);
        formData.append('timestamp', signRes.timestamp);
        formData.append('signature', signRes.signature);
        formData.append('upload_preset', signRes.uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`, { 
            method: 'POST', 
            body: formData 
        }).then(r => r.json());
        
        if (!res.secure_url) {
            throw new Error("Upload Failed");
        }
        return res.secure_url;
    }

    // --- POST CREATION ---
    if (btnSendPost && postInput) {
        btnSendPost.onclick = async () => {
            if (!requireLogin()) return;
            const text = postInput.value.trim();
            if (!text && !postImageFile && !postAttachedListing) return;
            
            btnSendPost.disabled = true;
            const origIcon = btnSendPost.innerHTML;
            btnSendPost.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                let uploadedImgUrl = null;
                if (postImageFile) {
                    uploadedImgUrl = await uploadImageToCloudinary(postImageFile);
                }

                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                const freshUserData = userDoc.data();
                const isStudent = freshUserData?.isStudent === true;

                let photoToSave = currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}&backgroundColor=EBF2FA`;
                
                const postingToSchool = currentSchoolFilter === 'my' ? targetSchool : "Global Campus";
                const collectionName = getSchoolCollection(postingToSchool);
                
                const requiresReview = uploadedImgUrl !== null;
                
                const postData = {
                    schoolName: postingToSchool,
                    text: text,
                    authorUid: currentUser.uid,
                    authorName: currentUser.displayName || "User",
                    authorPhoto: photoToSave,
                    authorIsStudent: isStudent,
                    likes: 0, 
                    likedBy: [], 
                    commentCount: 0,
                    status: requiresReview ? 'pending' : 'active',
                    timestamp: serverTimestamp()
                };

                if (uploadedImgUrl) postData.imageUrl = uploadedImgUrl;
                if (postAttachedListing) postData.attachedListing = postAttachedListing;

                const postRef = await addDoc(collection(db, collectionName), postData);

                if (requiresReview) {
                    fetch(getFunctionUrl('moderate-listing'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            imageUrls: [uploadedImgUrl], 
                            title: "Social Post", 
                            description: text 
                        })
                    }).then(r => r.json()).then(aiData => {
                        if (aiData.verdict === "UNSAFE") {
                            updateDoc(postRef, { 
                                status: 'rejected', 
                                rejectionReason: aiData.reason || "Inappropriate content" 
                            });
                        } else {
                            updateDoc(postRef, { status: 'active' });
                        }
                    }).catch(e => console.error("Moderation fetch failed:", e));
                }

                postInput.value = '';
                postInput.style.height = '40px'; 
                postInput.blur(); 
                postImageFile = null;
                postAttachedListing = null;
                renderComposerPreview();
                
            } catch (e) { 
                console.error(e);
                window.scoraliaAlert(ui.upload_fail); 
            } finally {
                btnSendPost.innerHTML = origIcon;
                btnSendPost.disabled = false;
                updateComposerSendButton();
            }
        };
    }

    // --- COMMENT IMAGE LOGIC ---
    const globalCommentImgInput = document.getElementById('global-comment-img-upload');
    
    window.triggerCommentImg = (postId, coll) => {
        if (!requireLogin()) return;
        activeCommentPostId = postId;
        activeCommentColl = coll;
        if (globalCommentImgInput) {
            globalCommentImgInput.click();
        }
    };

    let activeCommentColl = null;

    if (globalCommentImgInput) {
        globalCommentImgInput.onchange = (e) => {
            if (e.target.files[0] && activeCommentPostId) {
                const file = e.target.files[0];
                commentImageFiles[activeCommentPostId] = file;
                
                const pArea = document.getElementById(`comment-preview-area-${activeCommentPostId}`);
                if (pArea) {
                    pArea.innerHTML = `
                        <div class="preview-img-wrap" style="width: 50px; height: 50px;">
                            <img src="${URL.createObjectURL(file)}">
                            <button class="remove-preview-btn" onclick="window.removeCommentImg('${activeCommentPostId}')">&times;</button>
                        </div>
                    `;
                    pArea.style.display = 'flex';
                }
                const btnSend = document.getElementById(`btn-send-comment-${activeCommentPostId}`);
                if (btnSend) {
                    btnSend.disabled = false;
                }
            }
            e.target.value = '';
        };
    }

    window.removeCommentImg = (postId) => {
        delete commentImageFiles[postId];
        const pArea = document.getElementById(`comment-preview-area-${postId}`);
        if (pArea) pArea.style.display = 'none';
        
        const inputEl = document.getElementById(`comment-input-${postId}`);
        const btnSend = document.getElementById(`btn-send-comment-${postId}`);
        
        if (btnSend && inputEl) {
            btnSend.disabled = inputEl.value.trim().length === 0;
        }
    };

    window.postComment = async (postId, coll) => {
        if (!requireLogin()) return;
        const inputEl = document.getElementById(`comment-input-${postId}`);
        const btnEl = document.getElementById(`btn-send-comment-${postId}`);
        if (!inputEl || !btnEl) return;
        
        const text = inputEl.value.trim();
        const file = commentImageFiles[postId];
        
        if (!text && !file) return;
        
        btnEl.disabled = true;
        const origIcon = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            let uploadedImgUrl = null;
            if (file) {
                uploadedImgUrl = await uploadImageToCloudinary(file);
            }

            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const freshUserData = userDoc.data();
            const isStudent = freshUserData?.isStudent === true;

            let photoToSave = currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}&backgroundColor=EBF2FA`;

            const requiresReview = uploadedImgUrl !== null;

            const commentData = {
                text: text,
                authorUid: currentUser.uid,
                authorName: currentUser.displayName || "User",
                authorPhoto: photoToSave,
                authorIsStudent: isStudent,
                status: requiresReview ? 'pending' : 'active',
                timestamp: serverTimestamp()
            };

            if (uploadedImgUrl) commentData.imageUrl = uploadedImgUrl;

            const commentRef = await addDoc(collection(db, coll, postId, "comments"), commentData);
            await updateDoc(doc(db, coll, postId), { commentCount: increment(1) });

            if (requiresReview) {
                fetch(getFunctionUrl('moderate-listing'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        imageUrls: [uploadedImgUrl], 
                        title: "Social Comment", 
                        description: text 
                    })
                }).then(r => r.json()).then(aiData => {
                    if (aiData.verdict === "UNSAFE") {
                        updateDoc(commentRef, { 
                            status: 'rejected', 
                            rejectionReason: aiData.reason || "Inappropriate content" 
                        });
                    } else {
                        updateDoc(commentRef, { status: 'active' });
                    }
                }).catch(e => console.error("Moderation fetch failed:", e));
            }

            inputEl.value = '';
            window.removeCommentImg(postId);
        } catch(e) { 
            console.error(e); 
            window.scoraliaAlert("Upload failed."); 
        } finally { 
            btnEl.innerHTML = origIcon;
            btnEl.disabled = false; 
        }
    };


    // --- AUTH & SECURITY LOGIC ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ── LOGGED IN ──
            onSnapshot(doc(db, "users", user.uid), async (uSnap) => {
                if (uSnap.exists()) {
                    const data = uSnap.data();
                    currentUser = { ...user, ...data };
                    currentUserData = data;
                    internalSchoolName = data.schoolName || "Global Campus";
                    const isStudent = data.isStudent === true;
                    
                    if (dSchoolName) {
                        dSchoolName.textContent = internalSchoolName === "Global Campus" && data.role === 'admin' 
                            ? "Global Admin" 
                            : internalSchoolName;
                    }
                    
                    const composerPfp = document.getElementById('composer-pfp');
                    if (composerPfp) {
                        composerPfp.src = data.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}&backgroundColor=EBF2FA`;
                    }
                    
                    if (btnCreateWay) btnCreateWay.style.display = 'flex';
                    if (mSheetCreateWay) mSheetCreateWay.style.display = 'flex';

                    // Determine the target school for the "My School" feed
                    if (isStudent && internalSchoolName && internalSchoolName !== "Global Campus") {
                        targetSchool = internalSchoolName;
                    } else {
                        targetSchool = "Collège de Rosemont";
                    }

                    if (isStudent) {
                        const verifyBanner = document.getElementById('verify-banner');
                        if (verifyBanner) verifyBanner.style.display = 'none';
                        const sidebarCheck = document.getElementById('verified-check-sidebar');
                        if (sidebarCheck) sidebarCheck.style.display = 'inline-block';
                    } else {
                        const bannerDismissed = localStorage.getItem('verify_banner_dismissed') === 'true';
                        const verifyBanner = document.getElementById('verify-banner');
                        if (verifyBanner) verifyBanner.style.display = !bannerDismissed ? 'flex' : 'none';
                        const sidebarCheck = document.getElementById('verified-check-sidebar');
                        if (sidebarCheck) sidebarCheck.style.display = 'none';
                    }
                    
                    const filterBar = document.getElementById('filter-bar');
                    const myFilterBtn = document.getElementById('my-school-filter');
                    const allFilterBtn = document.getElementById('all-filter-btn');

                    if (filterBar) filterBar.style.display = 'flex';
                    if (myFilterBtn) myFilterBtn.textContent = targetSchool;
                    if (allFilterBtn) allFilterBtn.classList.add('active');
                    
                    if (currentSchoolFilter === 'my') {
                        if (myFilterBtn) myFilterBtn.classList.add('active');
                        if (allFilterBtn) allFilterBtn.classList.remove('active');
                    } else {
                        if (myFilterBtn) myFilterBtn.classList.remove('active');
                        if (allFilterBtn) allFilterBtn.classList.add('active');
                    }
                    
                    const composerCard = document.getElementById('composer-card');
                    if (currentSchoolFilter === 'my' && !isStudent && data.role !== 'admin') {
                        if (composerCard) composerCard.style.display = 'none';
                    } else {
                        if (composerCard) composerCard.style.display = 'flex';
                        if (postInput) {
                            if (currentSchoolFilter === 'all') {
                                postInput.placeholder = lang === 'fr' 
                                    ? "Que se passe-t-il sur le Campus Global ?" 
                                    : "What's happening on Global Campus?";
                            } else {
                                postInput.placeholder = lang === 'fr' 
                                    ? `Que se passe-t-il à ${targetSchool} ?` 
                                    : `What's happening at ${targetSchool}?`;
                            }
                        }
                    }

                    // hide login prompt if visible
                    if (typeof loginPromptModal !== 'undefined' && loginPromptModal) {
                        loginPromptModal.style.display = 'none';
                    }

                    // show composer and enable My School filter
                    if (document.getElementById('composer-card')) {
                        document.getElementById('composer-card').style.display = 'flex';
                    }
                    if (myFilterBtn) {
                        myFilterBtn.style.display = 'inline-block';
                    }

                    showHubLayout();
                    
                    if (typeof window.showSocialTour === 'function') {
                        const socialTourKey = `scoralia_social_tour_seen_${user.uid}`;
                        if (!currentUserData.hasSeenSocialTour && !localStorage.getItem(socialTourKey)) {
                            window.showSocialTour();
                        }
                    }
                    
                    await fetchMarketListings();
                    loadTopics(); 
                    loadFeed();
                } else {
                    window.location.href = '/login?redirect=/social';
                }
            });
        } else {
            // ── NOT LOGGED IN ──
            currentUser = null;
            currentUserData = null;

            // Show composer immediately so guests see the post box right away
            const composerCard = document.getElementById('composer-card');
            if (composerCard) {
                composerCard.style.display = 'flex';
            }
            // Set the placeholder to the global campus message
            if (postInput) {
                postInput.placeholder = lang === 'fr'
                    ? "Que se passe-t-il sur le Campus Global ?"
                    : "What's happening on Global Campus?";
            }

            // disable My School filter
            if (myFilterBtn) {
                myFilterBtn.style.display = 'none';
            }
            if (allFilterBtn) {
                allFilterBtn.classList.add('active');
            }
            if (myFilterBtn) {
                myFilterBtn.classList.remove('active');
            }
            currentSchoolFilter = 'all';

            if (feedContainer) {
                feedContainer.innerHTML = `
                    <div class="loader-msg">
                        <i class="fas fa-circle-notch fa-spin"></i><br>
                        <span>${ui.loading_hub}</span>
                    </div>
                `;
            }

            showHubLayout();
            loadTopics();
            loadGlobalFeed();           // ✅ immediately loads global feed
            maybeShowLoginPrompt();
        }
    });

    const closeBannerBtn = document.getElementById('close-banner-btn');
    if (closeBannerBtn) {
        closeBannerBtn.onclick = () => {
            const verifyBanner = document.getElementById('verify-banner');
            if (verifyBanner) verifyBanner.style.display = 'none';
            localStorage.setItem('verify_banner_dismissed', 'true');
        };
    }

    function showHubLayout() {
        const ls = document.getElementById('locked-screen');
        const hl = document.getElementById('hub-layout');
        const mtw = document.getElementById('mobile-topics-wrapper');
        
        if (ls) ls.style.display = 'none';
        if (hl) hl.style.display = window.innerWidth <= 850 ? 'flex' : 'grid';
        if (mtw) mtw.style.display = window.innerWidth <= 850 ? 'flex' : 'none';
    }

    function loadGlobalFeed() {
        if (unsubscribePosts) unsubscribePosts();
        Object.values(commentUnsubscribes).forEach(unsub => unsub());
        commentUnsubscribes = {};
        
        const q = query(collection(db, 'social_posts_global'), orderBy("timestamp", "desc"), limit(100));
        
        unsubscribePosts = onSnapshot(q, (snapshot) => {
            if (!feedContainer) return;
            feedContainer.innerHTML = '';
            
            if (snapshot.empty) {
                feedContainer.innerHTML = `<div class="loader-msg">${ui.noPosts}</div>`;
                return;
            }
            
            const frag = document.createDocumentFragment();
            snapshot.docs.forEach(docSnap => {
                const d = docSnap.data();
                if (d.status === 'pending' || d.status === 'rejected') return;
                frag.appendChild(createPostElement(docSnap.id, d, 'social_posts_global'));
            });
            feedContainer.appendChild(frag);
        });
    }

    window.addEventListener('resize', () => {
        if(currentUser) { 
            const hl = document.getElementById('hub-layout');
            const mtw = document.getElementById('mobile-topics-wrapper');
            
            if(window.innerWidth <= 850) {
                if (hl) hl.style.display = 'flex';
                if (mtw) mtw.style.display = 'flex';
            } else {
                if (hl) hl.style.display = 'grid';
                if (mtw) mtw.style.display = 'none';
            }
        }
    });

    function loadTopics() {
        const q = query(collection(db, "social_channels"));
        onSnapshot(q, (snapshot) => {
            allTopicsData = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            allTopicsData.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
            renderTopics();
        });
    }

    function renderTopics() {
        const dListMy = document.getElementById('d-list-my');
        const dListPinned = document.getElementById('d-list-pinned');
        const dListDiscover = document.getElementById('d-list-discover');
        
        const mListMy = document.getElementById('m-list-my');
        const mListPinned = document.getElementById('m-list-pinned');
        const mListDiscover = document.getElementById('m-list-discover');
        
        if (!dListMy || !mListMy) return; 

        dListMy.innerHTML = ''; 
        dListPinned.innerHTML = ''; 
        dListDiscover.innerHTML = '';
        
        mListMy.innerHTML = ''; 
        mListPinned.innerHTML = ''; 
        mListDiscover.innerHTML = '';
        
        if (mobileWaysList) {
            mobileWaysList.innerHTML = '';
        }

        const myT = [], pinT = [], discT = [];
        const pinnedArr = (currentUser && currentUser.pinnedTopics) || [];

        allTopicsData.forEach(d => {
            const isPrivate = d.visibility === 'private';
            const isOwner = currentUser && d.createdBy === currentUser.uid;
            const isMember = currentUser && d.members && d.members.includes(currentUser.uid);
            const isAdmin = currentUser && currentUser.role === 'admin';
            const isPinned = pinnedArr.includes(d.id);
            
            if (isPinned) {
                pinT.push(d);
            } else if (isOwner) {
                myT.push(d);
            } else {
                discT.push(d);
            }
        });

        const dSecMy = document.getElementById('d-sec-my');
        const dSecPinned = document.getElementById('d-sec-pinned');
        const dSecDiscover = document.getElementById('d-sec-discover');
        
        if (dSecMy) dSecMy.style.display = myT.length ? 'block' : 'none';
        if (dSecPinned) dSecPinned.style.display = pinT.length ? 'block' : 'none';
        if (dSecDiscover) dSecDiscover.style.display = discT.length ? 'block' : 'none';

        const mSecMy = document.getElementById('m-sec-my');
        const mSecPinned = document.getElementById('m-sec-pinned');
        const mSecDiscover = document.getElementById('m-sec-discover');
        
        if (mSecMy) mSecMy.style.display = myT.length ? 'block' : 'none';
        if (mSecPinned) mSecPinned.style.display = pinT.length ? 'block' : 'none';
        if (mSecDiscover) mSecDiscover.style.display = discT.length ? 'block' : 'none';

        const createItemHtml = (t, isDesktop, isMyTopic) => {
            const count = formatCount(t.postCount);
            const lock = t.visibility === 'private' ? ' <i class="fas fa-lock" style="font-size:0.65rem; margin-left:4px;"></i>' : '';
            const editBtn = isMyTopic ? `<a href="/edittopic?id=${t.id}" class="edit-way-btn" onclick="event.stopPropagation()"><i class="fas fa-cog"></i></a>` : '';
            
            const item = document.createElement('a');
            item.className = 'way-item'; 
            item.href = `/topic?id=${t.id}`;
            item.innerHTML = `
                <i class="fas fa-hashtag"></i> 
                <span style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${t.name}${lock}
                </span> 
                <span class="way-count">${count}</span>
                ${editBtn}
            `;
            return item;
        };

        const createTopBarItem = (t) => {
            const count = formatCount(t.postCount);
            const lock = t.visibility === 'private' ? ' <i class="fas fa-lock" style="font-size:0.65rem; margin-left:4px;"></i>' : '';
            
            const item = document.createElement('a');
            item.className = 'm-way-pill'; 
            item.href = `/topic?id=${t.id}`;
            item.innerHTML = `
                <i class="fas fa-hashtag"></i> 
                ${t.name}${lock} 
                <span class="m-way-count">${count}</span>
            `;
            return item;
        };

        const hasCustomTopics = myT.length > 0 || pinT.length > 0;

        myT.forEach(t => {
            dListMy.appendChild(createItemHtml(t, true, true));
            mListMy.appendChild(createItemHtml(t, false, true));
            if (mobileWaysList) mobileWaysList.appendChild(createTopBarItem(t));
        });

        pinT.forEach(t => {
            dListPinned.appendChild(createItemHtml(t, true, false));
            mListPinned.appendChild(createItemHtml(t, false, false));
            if (mobileWaysList) mobileWaysList.appendChild(createTopBarItem(t));
        });

        if (!hasCustomTopics) {
            discT.forEach(t => {
                if (mobileWaysList) mobileWaysList.appendChild(createTopBarItem(t));
            });
        }

        discT.forEach(t => {
            dListDiscover.appendChild(createItemHtml(t, true, false));
            mListDiscover.appendChild(createItemHtml(t, false, false));
        });
    }

    function createMarketBreak() {
        const breakSection = document.createElement('div');
        breakSection.className = 'market-break';
        
        let bookHtml = '';
        if (listings.length > 0) {
            listings.forEach(b => {
                const img = (b.imageUrls && b.imageUrls[0]) ? b.imageUrls[0] : '';
                const optimizedImg = typeof window.optimizeImageUrl === 'function' 
                    ? window.optimizeImageUrl(img) 
                    : img;
                bookHtml += `
                    <a href="/listing?id=${b.id}" class="mini-book-card">
                        <div class="mini-img" style="background-image:url('${optimizedImg}')"></div>
                        <div class="mini-info">
                            <div class="mini-price">$${b.price.toFixed(2)}</div>
                            <div class="mini-title">${b.title}</div>
                        </div>
                    </a>
                `;
            });
        } else {
            bookHtml = `
                <div style="padding:20px; text-align:center; color:var(--text-muted); width:100%;">
                    No books listed yet. Be the first!
                </div>
            `;
        }

        breakSection.innerHTML = `
            <div class="break-header">
                <span class="break-title">
                    <i class="fas fa-book-open"></i> ${ui.suggest || 'Campus Marketplace'}
                </span>
                <a href="/search" class="break-link">${ui.browse || 'Browse All →'}</a>
            </div>
            <div class="break-scroll">${bookHtml}</div>
        `;
        return breakSection;
    }

    function loadFeed() {
        if (unsubscribePosts) unsubscribePosts();
        Object.values(commentUnsubscribes).forEach(unsub => unsub());
        commentUnsubscribes = {};

        const isAdmin = currentUserData && currentUserData.role === 'admin';
        const isVerifiedStudent = currentUserData && currentUserData.isStudent === true;
        
        const isRosemont = (name) => name === "Cégep de Rosemont" || name === "Collège de Rosemont";
        const isVanier = (name) => name === "Vanier College";
        
        const matchesSchool = currentUserData && (
            currentUserData.schoolName === targetSchool || 
            (isRosemont(targetSchool) && isRosemont(currentUserData.schoolName)) ||
            (isVanier(targetSchool) && isVanier(currentUserData.schoolName))
        );

        if (currentSchoolFilter === 'my' && !isAdmin && (!isVerifiedStudent || !matchesSchool)) {
            const composerCard = document.getElementById('composer-card');
            if (composerCard) composerCard.style.display = 'none';

            if (feedContainer) {
                feedContainer.innerHTML = `
                    <div style="position: relative; min-height: 400px; overflow: hidden; border-radius: var(--radius-md);">
                        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; padding: 20px;">
                            <div style="background: rgba(255,255,255,0.95); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; max-width: 420px; margin: 0 20px;">
                                <i class="fas fa-lock" style="font-size: 3.5rem; color: var(--deep); margin-bottom: 20px;"></i>
                                <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: var(--ink); margin-bottom: 12px;">${ui.private_feed_locked}</h3>
                                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 25px; line-height: 1.6;">
                                    ${ui.private_feed_desc} <strong>${targetSchool}</strong> can view or participate in this channel.
                                </p>
                                <button class="btn-action" style="width: 100%;" onclick="window.location.href='/verify'">Verify Student Email</button>
                            </div>
                        </div>
                        
                        <div class="post-card" style="filter: blur(8px); opacity: 0.5; pointer-events: none; user-select: none; margin-bottom: 20px;">
                            <div class="post-header-top">
                                <div style="display:flex; gap:15px; align-items:center;">
                                    <div style="width:48px; height:48px; border-radius:50%; background:#cbd5e1;"></div>
                                    <div>
                                        <div style="width:120px; height:12px; background:#cbd5e1; border-radius:10px; margin-bottom:8px;"></div>
                                        <div style="width:80px; height:10px; background:#e2e8f0; border-radius:10px;"></div>
                                    </div>
                                </div>
                            </div>
                            <div style="width:100%; height:12px; background:#e2e8f0; border-radius:10px; margin-bottom:12px;"></div>
                            <div style="width:85%; height:12px; background:#e2e8f0; border-radius:10px; margin-bottom:12px;"></div>
                            <div style="width:60%; height:12px; background:#e2e8f0; border-radius:10px;"></div>
                        </div>
                        <div class="post-card" style="filter: blur(8px); opacity: 0.5; pointer-events: none; user-select: none;">
                            <div class="post-header-top">
                                <div style="display:flex; gap:15px; align-items:center;">
                                    <div style="width:48px; height:48px; border-radius:50%; background:#cbd5e1;"></div>
                                    <div>
                                        <div style="width:140px; height:12px; background:#cbd5e1; border-radius:10px; margin-bottom:8px;"></div>
                                        <div style="width:90px; height:10px; background:#e2e8f0; border-radius:10px;"></div>
                                    </div>
                                </div>
                            </div>
                            <div style="width:100%; height:12px; background:#e2e8f0; border-radius:10px; margin-bottom:12px;"></div>
                            <div style="width:95%; height:12px; background:#e2e8f0; border-radius:10px; margin-bottom:12px;"></div>
                            <div style="width:40%; height:12px; background:#e2e8f0; border-radius:10px;"></div>
                        </div>
                    </div>
                `;
            }
            return; 
        }

        const composerCard = document.getElementById('composer-card');
        if (composerCard) composerCard.style.display = 'flex';
        
        if (postInput) {
            if (currentSchoolFilter === 'all') {
                postInput.placeholder = lang === 'fr' 
                    ? "Que se passe-t-il sur le Campus Global ?" 
                    : "What's happening on Global Campus?";
            } else {
                postInput.placeholder = lang === 'fr' 
                    ? `Que se passe-t-il à ${targetSchool} ?` 
                    : `What's happening at ${targetSchool}?`;
            }
        }

        if (feedContainer) {
            feedContainer.innerHTML = `
                <div class="loader-msg">
                    <i class="fas fa-circle-notch fa-spin"></i><br>
                    <span>${ui.loading_hub || 'Loading campus hub...'}</span>
                </div>
            `;
        }

        const collectionName = currentSchoolFilter === 'my'
            ? getSchoolCollection(targetSchool)
            : 'social_posts_global';
        
        let q = query(
            collection(db, collectionName), 
            orderBy("timestamp", "desc"), 
            limit(100)
        );
        
        try {
            unsubscribePosts = onSnapshot(q, (snapshot) => {
                if (!feedContainer) return;
                feedContainer.innerHTML = '';
                
                if (snapshot.empty) {
                    feedContainer.innerHTML = `<div class="loader-msg">${ui.noPosts || 'No posts yet.'}</div>`;
                    feedContainer.appendChild(createMarketBreak());
                    return;
                }

                const frag = document.createDocumentFragment();
                let postCounter = 0;

                snapshot.docs.forEach(docSnap => {
                    const d = docSnap.data();
                    
                    if (d.status === 'pending' && d.authorUid !== currentUser?.uid) return;
                    if (d.status === 'rejected' && d.authorUid !== currentUser?.uid) return;

                    frag.appendChild(createPostElement(docSnap.id, d, collectionName));
                    postCounter++;

                    if (postCounter === 3) {
                        frag.appendChild(createMarketBreak());
                    }
                });
                
                if (postCounter < 3) {
                    frag.appendChild(createMarketBreak());
                }

                feedContainer.appendChild(frag);
            });
        } catch (e) { 
            console.error(e); 
        }
    }

    if (allFilterBtn) {
        allFilterBtn.onclick = () => {
            currentSchoolFilter = 'all';
            allFilterBtn.classList.add('active');
            if (myFilterBtn) myFilterBtn.classList.remove('active');
            loadFeed();
        };
    }
    
    if (myFilterBtn) {
        myFilterBtn.onclick = () => {
            if (!requireLogin()) return;
            currentSchoolFilter = 'my';
            myFilterBtn.classList.add('active');
            if (allFilterBtn) allFilterBtn.classList.remove('active');
            loadFeed();
        };
    }

    function createPostElement(id, d, coll) {
        if (d.status === 'rejected') {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.style.border = '1px solid #fecaca';
            card.style.background = '#fef2f2';
            card.innerHTML = `
                <p style="color: #b91c1c; font-weight: bold; font-size: 0.95rem; margin-bottom: 10px;">
                    <i class="fas fa-shield-alt"></i> Your post was removed by our safety system.
                </p>
                <p style="color: #991b1b; font-size: 0.85rem; margin-bottom: 15px;">
                    Reason: ${d.rejectionReason || 'Inappropriate content.'}
                </p>
                <button class="btn-action" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 8px 16px; font-size: 0.85rem;" onclick="window.deletePost('${id}', '${coll}')">
                    Delete Post
                </button>
            `;
            return card;
        }

        let pfp = d.authorPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${d.authorUid}&backgroundColor=EBF2FA`;
        let timeStr = d.timestamp ? formatTime(d.timestamp.toDate()) : (ui.justNow || "Just now");
        const isLiked = currentUser && d.likedBy && d.likedBy.includes(currentUser.uid);
        
        const schoolTagHtml = (d.schoolName && d.schoolName !== 'Global Campus') 
            ? `<span style="font-size: 0.7rem; color: var(--deep); background: var(--surface); padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-weight: 700; white-space: nowrap;"><i class="fas fa-university"></i> ${d.schoolName}</span>` 
            : '';

        const verifiedAvatarBadge = d.authorIsStudent 
            ? '<div class="avatar-badge"><i class="fas fa-check-circle"></i></div>' 
            : '';
        
        const avatarHtml = `
            <div class="post-avatar-wrap">
                <img src="${pfp}" class="post-avatar" alt="Avatar">
                ${verifiedAvatarBadge}
            </div>
        `;

        const verifiedNameBadge = d.authorIsStudent 
            ? '<i class="fas fa-check-circle" style="color: #2E7D32; font-size: 0.9rem; margin-left: 4px;" title="Verified Student"></i>' 
            : '';

        const pendingBadgeHtml = d.status === 'pending' 
            ? `<span style="font-size:0.7rem; color:#d97706; background:#fef3c7; padding:2px 6px; border-radius:10px; margin-left:6px; border: 1px solid #fde68a;">⏳ In Review</span>` 
            : '';

        const canEdit = currentUser && currentUser.uid === d.authorUid;
        const canDelete = currentUser && (currentUser.uid === d.authorUid || currentUser.role === 'admin');
        
        const safeText = d.text 
            ? d.text.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/\n/g, "\\n") 
            : '';
        
        const editBtnHtml = canEdit 
            ? `<button class="post-dropdown-item" onclick="window.openEditPost('${id}', '${safeText}', '${coll}')"><i class="fas fa-edit"></i> Edit Post</button>` 
            : '';
        
        const deleteBtnHtml = canDelete 
            ? `<button class="post-dropdown-item danger" onclick="window.deletePost('${id}', '${coll}')"><i class="fas fa-trash-alt"></i> Delete Post</button>` 
            : '';
        
        const editedLabel = d.edited 
            ? `<span class="edited-badge" data-i18n="edited_label">${ui.edited_label || ' • Edited'}</span>` 
            : '';

        let attachedImgHtml = '';
        if (d.imageUrl) {
            const optimizedUrl = window.optimizeImageUrl ? window.optimizeImageUrl(d.imageUrl) : d.imageUrl;
            attachedImgHtml = `<img src="${optimizedUrl}" class="post-image-attachment">`;
        }
        
        let attachedListHtml = '';
        if (d.attachedListing) {
            const optimizedListImg = window.optimizeImageUrl 
                ? window.optimizeImageUrl(d.attachedListing.img) 
                : d.attachedListing.img;
            
            attachedListHtml = `
                <a href="/listing?id=${d.attachedListing.id}" class="post-listing-attachment">
                    <div class="pla-img" style="background-image:url('${optimizedListImg}')"></div>
                    <div class="pla-info">
                        <div class="pla-title">${d.attachedListing.title}</div>
                        <div class="pla-price">$${d.attachedListing.price}</div>
                    </div>
                </a>
            `;
        }

        const commentSectionHtml = `
            <div class="comments-section" id="comments-section-${id}">
                <div class="comment-list" id="comment-list-${id}">
                    <div style="text-align:center; font-size:0.8rem; color:#888;">
                        <i class="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                </div>
                <div class="comment-composer-area">
                    <div class="comment-preview-area" id="comment-preview-area-${id}"></div>
                    <div class="comment-input-wrapper">
                        <textarea class="comment-input" id="comment-input-${id}" data-coll="${coll}" placeholder="${ui.comment_placeholder || 'Write a comment...'}" oninput="window.checkCommentInput('${id}')" onclick="window.requireLogin()"></textarea>
                        <div class="comment-tools">
                            <button class="tool-btn" onclick="window.triggerCommentImg('${id}', '${coll}')">
                                <i class="fas fa-camera"></i>
                            </button>
                            <button class="btn-comment-send" onclick="window.postComment('${id}', '${coll}')" id="btn-send-comment-${id}">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header-top">
                <a href="/user?id=${d.authorUid}" class="post-author-link">
                    ${avatarHtml}
                    <div class="post-meta">
                        <span class="post-author" style="display:flex; align-items:center; flex-wrap:wrap;">
                            ${d.authorName}${verifiedNameBadge} ${schoolTagHtml} ${pendingBadgeHtml}
                        </span>
                        <span class="post-time">${timeStr}${editedLabel}</span>
                    </div>
                </a>
                <div class="post-menu-container">
                    <button class="post-menu-btn" onclick="window.togglePostMenu('${id}')">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="post-dropdown" id="post-dropdown-${id}">
                        ${editBtnHtml}
                        <button class="post-dropdown-item" onclick="window.reportPost('${id}', '${d.authorUid}', '${d.authorName.replace(/'/g, "\\'")}', '${coll}')">
                            <i class="fas fa-flag"></i> Report
                        </button>
                        ${deleteBtnHtml}
                    </div>
                </div>
            </div>

            <div class="post-body">${d.text || ''}</div>
            
            ${attachedImgHtml}
            ${attachedListHtml}

            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="window.likePost('${id}', ${isLiked}, '${coll}')">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${d.likes || 0}
                </button>
                <button class="action-btn" onclick="window.toggleComments('${id}', '${coll}')">
                    <i class="far fa-comment"></i> ${d.commentCount || 0}
                </button>
            </div>

            ${commentSectionHtml}
        `;
        return card;
    }

    function formatTime(date) {
        const diff = Math.round((new Date() - date) / 60000);
        if (diff < 60) {
            return lang === 'fr' ? `Il y a ${diff} min` : `${diff}m`;
        }
        if (diff < 1440) {
            return lang === 'fr' ? `${Math.round(diff/60)} h` : `${Math.round(diff/60)}h`;
        }
        return lang === 'fr' ? `${Math.round(diff/1440)} j` : `${Math.round(diff/1440)}d`;
    }

    window.checkCommentInput = (id) => {
        const val = document.getElementById(`comment-input-${id}`).value.trim();
        const hasImg = !!commentImageFiles[id];
        const btn = document.getElementById(`btn-send-comment-${id}`);
        if (btn) {
            btn.style.opacity = (!val && !hasImg) ? '0.5' : '1';
        }
    };

    window.togglePostMenu = (id) => {
        const dropdown = document.getElementById(`post-dropdown-${id}`);
        if (!dropdown) return;
        const isShowing = dropdown.classList.contains('show');
        
        document.querySelectorAll('.post-dropdown').forEach(d => {
            d.classList.remove('show');
        }); 
        
        if (!isShowing) {
            dropdown.classList.add('show');
        }
    };

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.post-menu-container')) {
            document.querySelectorAll('.post-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        }
    });

    window.deletePost = async (id, coll) => {
        if (!requireLogin()) return;
        const confirmed = await window.scoraliaConfirm(ui.dialog_delete_post);
        if(confirmed) {
            try {
                await deleteDoc(doc(db, coll, id));
            } catch(e) { 
                await window.scoraliaAlert("Error deleting post."); 
            }
        }
    };

    let reportTargetId = null; 
    let reportTargetName = null; 
    let reportTargetPostId = null; 
    let reportTargetColl = null;

    window.reportPost = (postId, authorUid, authorName, coll) => {
        if (!requireLogin()) return;
        document.querySelectorAll('.post-dropdown').forEach(d => {
            d.classList.remove('show');
        });
        reportTargetId = authorUid; 
        reportTargetName = authorName; 
        reportTargetPostId = postId; 
        reportTargetColl = coll;
        
        const reportDetails = document.getElementById('report-details');
        if (reportDetails) reportDetails.value = '';
        
        const reportModal = document.getElementById('report-modal');
        if (reportModal) reportModal.style.display = 'flex';
    };

    const btnCancelReport = document.getElementById('btn-cancel-report');
    if (btnCancelReport) {
        btnCancelReport.onclick = () => { 
            const reportModal = document.getElementById('report-modal');
            if (reportModal) reportModal.style.display = 'none'; 
        };
    }
    
    const btnSubmitReport = document.getElementById('btn-submit-report');
    if (btnSubmitReport) {
        btnSubmitReport.onclick = async () => {
            const reasonEl = document.getElementById('report-reason');
            const detailsEl = document.getElementById('report-details');
            if (!reasonEl || !detailsEl) return;
            
            const reason = reasonEl.value;
            const details = detailsEl.value.trim();
            const btn = document.getElementById('btn-submit-report');
            
            btn.disabled = true;
            try {
                await addDoc(collection(db, "reports"), {
                    reporterUid: currentUser.uid, 
                    reporterName: currentUser.displayName,
                    targetUid: reportTargetId, 
                    targetUserName: reportTargetName,
                    reason: `Post Report: ${reason}`,
                    details: `Post ID: ${reportTargetPostId}\nCollection: ${reportTargetColl}\n\n${details}`,
                    timestamp: serverTimestamp()
                });
                
                await window.scoraliaAlert(ui.rep_success || "Report submitted.");
                const reportModal = document.getElementById('report-modal');
                if (reportModal) reportModal.style.display = 'none';
            } catch(e) { 
                await window.scoraliaAlert("Error submitting report."); 
            }
            btn.disabled = false;
        };
    }

    let editTargetPostId = null;
    let editTargetColl = null;

    window.openEditPost = (postId, encodedText, coll) => {
        if (!requireLogin()) return;
        document.querySelectorAll('.post-dropdown').forEach(d => {
            d.classList.remove('show');
        });
        editTargetPostId = postId;
        editTargetColl = coll;
        
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedText;
        
        const editPostText = document.getElementById('edit-post-text');
        const editPostModal = document.getElementById('edit-post-modal');
        
        if (editPostText) editPostText.value = textarea.value;
        if (editPostModal) editPostModal.style.display = 'flex';
    };

    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editPostModal = document.getElementById('edit-post-modal');
    
    if (btnCancelEdit) {
        btnCancelEdit.onclick = () => { 
            if (editPostModal) editPostModal.style.display = 'none'; 
        };
    }
    if (closeEditModal) {
        closeEditModal.onclick = () => { 
            if (editPostModal) editPostModal.style.display = 'none'; 
        };
    }

    const btnSubmitEdit = document.getElementById('btn-submit-edit');
    if (btnSubmitEdit) {
        btnSubmitEdit.onclick = async () => {
            const editPostText = document.getElementById('edit-post-text');
            if (!editPostText) return;
            
            const newText = editPostText.value.trim();
            btnSubmitEdit.disabled = true;

            try {
                await updateDoc(doc(db, editTargetColl, editTargetPostId), {
                    text: newText,
                    edited: true
                });
                if (editPostModal) editPostModal.style.display = 'none';
            } catch(e) {
                await window.scoraliaAlert("Error updating post.");
            }
            btnSubmitEdit.disabled = false;
        };
    }

    window.likePost = async (id, alreadyLiked, coll) => {
        if (!requireLogin()) return;
        const ref = doc(db, coll, id);
        if(alreadyLiked) {
            await updateDoc(ref, { 
                likes: increment(-1), 
                likedBy: arrayRemove(currentUser.uid) 
            });
        } else {
            await updateDoc(ref, { 
                likes: increment(1), 
                likedBy: arrayUnion(currentUser.uid) 
            });
        }
    };

    window.toggleComments = (id, coll) => {
        if (!requireLogin()) return;
        const sec = document.getElementById(`comments-section-${id}`);
        if (!sec) return;
        
        if (sec.style.display === 'block') { 
            sec.style.display = 'none'; 
            if(commentUnsubscribes[id]) {
                commentUnsubscribes[id](); 
            }
        } else { 
            sec.style.display = 'block'; 
            loadComments(id, coll); 
        }
    };

    function loadComments(postId, coll) {
        const list = document.getElementById(`comment-list-${postId}`);
        if (!list) return;
        
        const q = query(
            collection(db, coll, postId, "comments"), 
            orderBy("timestamp", "asc")
        );
        
        commentUnsubscribes[postId] = onSnapshot(q, (snap) => {
            list.innerHTML = snap.empty 
                ? `<div style="text-align:center; font-size:0.85rem; color:#888;">${ui.no_comments || 'No comments yet.'}</div>` 
                : '';
                
            snap.forEach(docSnap => {
                const c = docSnap.data();
                const commentId = docSnap.id;

                if (c.status === 'pending' && c.authorUid !== currentUser?.uid) return;
                if (c.status === 'rejected' && c.authorUid !== currentUser?.uid) return;

                if (c.status === 'rejected') {
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.innerHTML = `
                        <div class="comment-content" style="background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.85rem;">
                            <i class="fas fa-shield-alt"></i> Your comment was removed by our safety system. 
                            <button onclick="window.deleteComment('${postId}', '${commentId}', '${coll}')" style="background:none; border:none; color:#b91c1c; text-decoration:underline; cursor:pointer; margin-left:10px;">
                                Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(div);
                    return;
                }

                let timeStr = ui.justNow || "Just now";
                if (c.timestamp) {
                    const diffMins = Math.round((new Date() - c.timestamp.toDate()) / 60000);
                    if (diffMins < 60) {
                        timeStr = lang === 'fr' ? `Il y a ${diffMins}m` : `${diffMins}m`;
                    } else if (diffMins < 1440) {
                        timeStr = lang === 'fr' ? `Il y a ${Math.round(diffMins/60)}h` : `${Math.round(diffMins/60)}h`;
                    } else {
                        timeStr = lang === 'fr' ? `Il y a ${Math.round(diffMins/1440)}j` : `${Math.round(diffMins/1440)}d`;
                    }
                }
                
                const pfp = c.authorPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.authorUid}&backgroundColor=EBF2FA`;
                let imgHtml = '';
                if (c.imageUrl) {
                    const optimizedCommentImg = window.optimizeImageUrl ? window.optimizeImageUrl(c.imageUrl) : c.imageUrl;
                    imgHtml = `<img src="${optimizedCommentImg}" class="comment-image-attachment">`;
                }
                
                const commentVerifiedAvatar = c.authorIsStudent 
                    ? '<div class="comment-avatar-badge"><i class="fas fa-check-circle"></i></div>' 
                    : '';
                    
                const commentAvatarHtml = `
                    <a href="/user?id=${c.authorUid}">
                        <div class="comment-avatar-wrapper">
                            <img src="${pfp}" alt="Avatar">
                            ${commentVerifiedAvatar}
                        </div>
                    </a>
                `;
                
                const pendingBadgeHtml = c.status === 'pending' 
                    ? `<span style="font-size:0.65rem; color:#d97706; background:#fef3c7; padding:2px 6px; border-radius:10px; margin-left:6px;">⏳ In Review</span>` 
                    : '';

                const isCommentAuthor = currentUser && currentUser.uid === c.authorUid;
                const isAdmin = currentUser && currentUser.role === 'admin';

                const deleteBtnHtml = (isCommentAuthor || isAdmin) 
                    ? `<button onclick="window.deleteComment('${postId}', '${commentId}', '${coll}')" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.75rem; margin-left:10px;"><i class="fas fa-trash-alt"></i></button>` 
                    : '';

                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `
                    ${commentAvatarHtml}
                    <div class="comment-content">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <a href="/user?id=${c.authorUid}" class="comment-author-link">
                                <div class="comment-author">${c.authorName} ${pendingBadgeHtml}</div>
                            </a>
                            ${deleteBtnHtml}
                        </div>
                        <div class="comment-text">${c.text}</div>
                        ${imgHtml}
                        <div class="comment-time">${timeStr}</div>
                    </div>
                `;
                list.appendChild(div);
            });
            list.scrollTop = list.scrollHeight;
        });
    }

    window.deleteComment = async (postId, commentId, coll) => {
        if (!requireLogin()) return;
        const confirmed = await window.scoraliaConfirm(ui.dialog_delete_comment);
        if(confirmed) {
            try {
                await deleteDoc(doc(db, coll, postId, "comments", commentId));
                await updateDoc(doc(db, coll, postId), { commentCount: increment(-1) });
            } catch(e) {
                console.error(e);
                await window.scoraliaAlert("Permission denied or error deleting.");
            }
        }
    };

    window.requireLogin = requireLogin; // Expose for inline handlers

    document.body.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
            e.preventDefault();
            if (!requireLogin()) return;
            const coll = e.target.getAttribute('data-coll');
            window.postComment(e.target.id.replace('comment-input-', ''), coll);
        }
    });
}

main();
