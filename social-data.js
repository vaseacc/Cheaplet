// social-data.js
import { getFirestore, doc, updateDoc, increment, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

const db = window.scoraliaDb;

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
    if (!window.scoraliaAuth.currentUser) return;
    const ref = doc(db, coll, id);
    await updateDoc(ref, {
        likes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(window.scoraliaAuth.currentUser.uid) : arrayUnion(window.scoraliaAuth.currentUser.uid)
    });
}

export async function deletePost(id, coll) {
    await deleteDoc(doc(db, coll, id));
}

export async function deleteComment(postId, commentId, coll) {
    await deleteDoc(doc(db, coll, postId, "comments", commentId));
    await updateDoc(doc(db, coll, postId), { commentCount: increment(-1) });
}

// Assign to window so inline onclick handlers still work
window.likePost = likePost;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.uploadImageToCloudinary = uploadImageToCloudinary;
