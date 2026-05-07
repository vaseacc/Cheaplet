// social-data.js
import { getFirestore, doc, updateDoc, increment, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, deleteDoc, getDoc, query, where, onSnapshot, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

const db = window.scoraliaDb; // already set by global.js

export async function likePost(id, alreadyLiked, coll) {
  const ref = doc(db, coll, id);
  await updateDoc(ref, {
    likes: increment(alreadyLiked ? -1 : 1),
    likedBy: alreadyLiked ? arrayRemove(window.scoraliaAuth.currentUser.uid) : arrayUnion(window.scoraliaAuth.currentUser.uid)
  });
}

export async function postComment(postId, coll, currentUser, text, file) {
  if (!text.trim()) return;
  
  const commentsRef = collection(db, coll, postId, "comments");
  await addDoc(commentsRef, {
    text: text,
    authorId: currentUser,
    timestamp: serverTimestamp(),
    authorName: window.currentUserData?.name || "Unknown",
    authorPhoto: window.currentUserData?.photo || "assets/default-avatar.png"
  });
  
  // Update comment count
  const postRef = doc(db, coll, postId);
  await updateDoc(postRef, {
    commentCount: increment(1)
  });
  
  // Clear the input field
  const inputField = document.getElementById(`comment-input-${postId}`);
  if (inputField) {
    inputField.value = '';
  }
}

export async function deletePost(id, coll) {
  await deleteDoc(doc(db, coll, id));
}

export async function deleteComment(postId, commentId, coll) {
  await deleteDoc(doc(db, coll, postId, "comments", commentId));
  await updateDoc(doc(db, coll, postId), { commentCount: increment(-1) });
}

export async function uploadImageToCloudinary(file) {
  if (!file) return null;
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "scorialia_images"); // Replace with your Cloudinary preset
  
  try {
    const response = await fetch("https://api.cloudinary.com/v1_1/dyourcloudname/image/upload", {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

export async function fetchMarketListings() {
  try {
    const marketRef = collection(db, "market");
    const q = query(marketRef, orderBy("timestamp", "desc"), limit(10));
    const snapshot = await getDocs(q);
    
    const listings = [];
    snapshot.forEach(doc => {
      listings.push({ id: doc.id, ...doc.data() });
    });
    
    return listings;
  } catch (error) {
    console.error("Error fetching market listings:", error);
    return [];
  }
}

// Assign functions to window so onClick handlers still work
window.likePost = likePost;
window.postComment = postComment;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.fetchMarketListings = fetchMarketListings;
