// social-data.js
import { getFirestore, doc, updateDoc, increment, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, deleteDoc, query, orderBy, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

const db = window.scoraliaDb; // Set by global.js

export async function uploadImageToCloudinary(file) {
    const signRes = await fetch(window.getFunctionUrl('sign-upload')).then(r => r.json());
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signRes.apiKey);
    formData.append('timestamp', signRes.timestamp);
    formData.append('signature', signRes.signature);
    formData.append('upload_preset', signRes.uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`, { method: 'POST', body: formData }).then(r => r.json());
    if (!res.secure_url) throw new Error("Upload Failed");
    return res.secure_url;
}

export async function likePost(id, alreadyLiked, coll) {
    const ref = doc(db, coll, id);
    await updateDoc(ref, {
        likes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(window.scoraliaAuth.currentUser.uid) : arrayUnion(window.scoraliaAuth.currentUser.uid)
    });
}

export async function postComment(postId, coll, currentUser, text, file, commentImageFiles) {
    const db = getFirestore();
    let uploadedImgUrl = null;
    if (file) uploadedImgUrl = await uploadImageToCloudinary(file);

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const freshUserData = userDoc.data();
    const isStudent = freshUserData?.isStudent === true;
    let photoToSave = currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}&backgroundColor=EBF2FA`;

    const commentData = {
        text,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || "User",
        authorPhoto: photoToSave,
        authorIsStudent: isStudent,
        status: uploadedImgUrl ? 'pending' : 'active',
        timestamp: serverTimestamp()
    };
    if (uploadedImgUrl) commentData.imageUrl = uploadedImgUrl;

    const commentRef = await addDoc(collection(db, coll, postId, "comments"), commentData);
    await updateDoc(doc(db, coll, postId), { commentCount: increment(1) });
    return commentRef;
}

export async function deletePost(id, coll) {
    await deleteDoc(doc(db, coll, id));
    // Also decrement postCount in the topic channel if applicable
    // This can be handled by the caller if needed
}

export async function deleteComment(postId, commentId, coll) {
    await deleteDoc(doc(db, coll, postId, "comments", commentId));
    await updateDoc(doc(db, coll, postId), { commentCount: increment(-1) });
}

export function loadComments(postId, coll, listElement) {
    return onSnapshot(query(collection(db, coll, postId, "comments"), orderBy("timestamp", "asc")), (snap) => {
        listElement.innerHTML = '';
        snap.forEach(docSnap => {
            const c = docSnap.data();
            // Render comment item (you can use a UI function for this as well)
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = buildCommentHTML(c, docSnap.id, postId, coll);
            listElement.appendChild(div);
        });
        listElement.scrollTop = listElement.scrollHeight;
    });
}

function buildCommentHTML(c, commentId, postId, coll) {
    // Minimal example – you can move createCommentItem from createPostElement here
    let timeStr = 'Just now';
    if (c.timestamp) {
        const diffMins = Math.round((new Date() - c.timestamp.toDate()) / 60000);
        timeStr = diffMins < 60 ? `${diffMins}m` : `${Math.round(diffMins/60)}h`;
    }
    const pfp = c.authorPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.authorUid}&backgroundColor=EBF2FA`;
    const imgHtml = c.imageUrl ? `<img src="${window.optimizeImageUrl ? window.optimizeImageUrl(c.imageUrl) : c.imageUrl}" class="comment-image-attachment">` : '';
    const verifiedBadge = c.authorIsStudent ? '<div class="comment-avatar-badge"><i class="fas fa-check-circle"></i></div>' : '';
    const deleteBtnHtml = (c.authorUid === window.scoraliaAuth.currentUser?.uid || window.scoraliaAuth.currentUser?.role === 'admin') ?
        `<button onclick="window.deleteComment('${postId}', '${commentId}', '${coll}')" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.75rem; margin-left:10px;"><i class="fas fa-trash-alt"></i></button>` : '';
    
    return `
        <a href="/user.html?id=${c.authorUid}"><div class="comment-avatar-wrap"><img src="${pfp}" class="comment-avatar" alt="Avatar">${verifiedBadge}</div></a>
        <div class="comment-content">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <a href="/user.html?id=${c.authorUid}" class="comment-author-link"><div class="comment-author">${c.authorName}</div></a>
                ${deleteBtnHtml}
            </div>
            <div class="comment-text">${c.text}</div>
            ${imgHtml}
            <div class="comment-time">${timeStr}</div>
        </div>
    `;
}
