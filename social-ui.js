// social-ui.js
// Reusable UI-building functions for social/topic pages

export function formatCount(num) {
    if (!num) return 0;
    return num > 999 ? (num / 1000).toFixed(1) + 'k' : num;
}

export function formatTime(date, lang) {
    const diff = Math.round((new Date() - date) / 60000);
    if (diff < 60) return lang === 'fr' ? `Il y a ${diff} min` : `${diff}m`;
    if (diff < 1440) return lang === 'fr' ? `${Math.round(diff / 60)} h` : `${Math.round(diff / 60)}h`;
    return lang === 'fr' ? `${Math.round(diff / 1440)} j` : `${Math.round(diff / 1440)}d`;
}

export function createPostElement(id, d, coll, ui, currentUser, options = {}) {
    const { isTopicOwner = false, topicOwnerUid = null } = options;

    if (d.status === 'rejected') {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.style.border = '1px solid #fecaca';
        card.style.background = '#fef2f2';
        card.innerHTML = `
            <p style="color: #b91c1c; font-weight: bold; font-size: 0.95rem; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> Your post was removed by our safety system.
            </p>
            <p style="color: #991b1b; font-size: 0.85rem; margin-bottom: 15px;">Reason: ${d.rejectionReason || 'Inappropriate content.'}</p>
            <button class="btn-action" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 8px 16px; font-size: 0.85rem;" onclick="window.deletePost('${id}', '${coll}')">Delete Post</button>
        `;
        return card;
    }

    let pfp = d.authorPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${d.authorUid}&backgroundColor=EBF2FA`;
    let timeStr = d.timestamp ? formatTime(d.timestamp.toDate(), ui.lang) : ui.justNow;
    const isLiked = currentUser && d.likedBy && d.likedBy.includes(currentUser.uid);
    const verifiedAvatarBadge = d.authorIsStudent ? '<div class="avatar-badge"><i class="fas fa-check-circle"></i></div>' : '';
    const avatarHtml = `<div class="post-avatar-wrap"><img src="${pfp}" class="post-avatar" alt="Avatar">${verifiedAvatarBadge}</div>`;
    const ownerBadge = (topicOwnerUid && d.authorUid === topicOwnerUid) ? '<i class="fas fa-crown" style="color: var(--gold); font-size: 0.7rem; margin-left: 2px;"></i>' : '';
    const pendingBadgeHtml = d.status === 'pending' ? `<span style="font-size:0.65rem; color:#d97706; background:#fef3c7; padding:2px 6px; border-radius:10px; margin-left:6px; border: 1px solid #fde68a;">⏳ In Review</span>` : '';
    const canEdit = currentUser && currentUser.uid === d.authorUid;
    const canDelete = currentUser && (currentUser.uid === d.authorUid || isTopicOwner || currentUser.role === 'admin');
    const safeText = d.text ? d.text.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/\n/g, "\\n") : '';
    const editBtnHtml = canEdit ? `<button class="post-dropdown-item" onclick="window.openEditPost('${id}', '${safeText}', '${coll}')"><i class="fas fa-edit"></i> Edit Post</button>` : '';
    const deleteBtnHtml = canDelete ? `<button class="post-dropdown-item danger" onclick="window.deletePost('${id}', '${coll}')"><i class="fas fa-trash-alt"></i> Delete Post</button>` : '';
    const editedLabel = d.edited ? `<span class="edited-badge">${ui.edited_label}</span>` : '';
    let attachedImgHtml = d.imageUrl ? `<img src="${window.optimizeImageUrl ? window.optimizeImageUrl(d.imageUrl) : d.imageUrl}" class="post-image-attachment">` : '';
    let attachedListHtml = '';
    if (d.attachedListing) {
        attachedListHtml = `
            <a href="/listing.html?id=${d.attachedListing.id}" class="post-listing-attachment">
                <div class="pla-img" style="background-image:url('${window.optimizeImageUrl ? window.optimizeImageUrl(d.attachedListing.img) : d.attachedListing.img}')"></div>
                <div class="pla-info">
                    <div class="pla-title">${d.attachedListing.title}</div>
                    <div class="pla-price">$${d.attachedListing.price}</div>
                </div>
            </a>
        `;
    }

    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
        <div class="post-header-top">
            <a href="/user.html?id=${d.authorUid}" class="post-author-link">
                ${avatarHtml}
                <div class="post-meta">
                    <span class="post-author" style="display:flex; align-items:center; flex-wrap:wrap;">
                        ${d.authorName} ${ownerBadge} ${pendingBadgeHtml}
                    </span>
                    <span class="post-time">${timeStr}${editedLabel}</span>
                </div>
            </a>
            <div class="post-menu-container">
                <button class="post-menu-btn" onclick="window.togglePostMenu('${id}')"><i class="fas fa-ellipsis-h"></i></button>
                <div class="post-dropdown" id="post-dropdown-${id}">
                    ${editBtnHtml}
                    <button class="post-dropdown-item" onclick="window.reportPost('${id}', '${d.authorUid}', '${d.authorName.replace(/'/g, "\\'")}', '${coll}')"><i class="fas fa-flag"></i> Report</button>
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

        <div class="comments-section" id="comments-section-${id}">
            <div class="comment-list" id="comment-list-${id}">
                <div style="text-align:center; font-size:0.8rem; color:#888;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
            </div>
            <div class="comment-composer-area">
                <div class="comment-preview-area" id="comment-preview-area-${id}"></div>
                <div class="comment-input-wrapper">
                    <textarea class="comment-input" id="comment-input-${id}" placeholder="${ui.comment_placeholder || 'Write a comment...'}" oninput="window.checkCommentInput('${id}')"></textarea>
                    <div class="comment-tools">
                        <button class="tool-btn" onclick="window.triggerCommentImg('${id}', '${coll}')"><i class="fas fa-camera"></i></button>
                        <button class="btn-comment-send" onclick="window.postComment('${id}', '${coll}')" id="btn-send-comment-${id}" disabled><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return card;
}

export function createMarketBreak(listings, ui) {
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
                <a href="/listing.html?id=${b.id}" class="mini-book-card">
                    <div class="mini-img" style="background-image:url('${optimizedImg}')"></div>
                    <div class="mini-info">
                        <div class="mini-price">$${b.price.toFixed(2)}</div>
                        <div class="mini-title">${b.title}</div>
                    </div>
                </a>
            `;
        });
    } else {
        bookHtml = `<div style="padding:20px; text-align:center; color:var(--text-muted); width:100%;">No books listed yet. Be the first!</div>`;
    }

    breakSection.innerHTML = `
        <div class="break-header">
            <span class="break-title"><i class="fas fa-book-open"></i> ${ui.suggest || 'Campus Marketplace'}</span>
            <a href="/search.html" class="break-link">${ui.browse || 'Browse All →'}</a>
        </div>
        <div class="break-scroll">${bookHtml}</div>
    `;
    return breakSection;
}
