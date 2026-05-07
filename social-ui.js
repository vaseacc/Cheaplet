// social-ui.js
export function formatCount(num) {
  return !num ? 0 : num > 999 ? (num / 1000).toFixed(1) + 'k' : num;
}

export function formatTime(date, lang) {
  const diff = Math.round((new Date() - date) / 60000);
  if (diff < 60) return lang === 'fr' ? `Il y a ${diff} min` : `${diff}m`;
  if (diff < 1440) return lang === 'fr' ? `${Math.round(diff/60)} h` : `${Math.round(diff/60)}h`;
  return lang === 'fr' ? `${Math.round(diff/1440)} j` : `${Math.round(diff/1440)}d`;
}

// createPostElement – exact code from social.html, but accept additional params like ui, lang, currentUser, etc.
export function createPostElement(id, d, coll, ui, currentUser, extraOptions = {}) {
  const container = document.createElement('div');
  container.className = 'post-container';
  container.innerHTML = `
    <div class="post" id="${id}">
      <div class="post-header">
        <img src="${d.authorPhoto || 'assets/default-avatar.png'}" alt="${d.authorName}" class="avatar">
        <div class="post-info">
          <div class="author">${d.authorName}</div>
          <div class="time">${formatTime(d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp), extraOptions.lang)}</div>
        </div>
        ${d.authorId === currentUser.uid ? 
          `<button class="delete-btn" onclick="window.deletePost('${id}', '${coll}')">${ui.delete}</button>` : 
          ''}
      </div>
      <div class="post-content">
        ${d.text ? `<p>${d.text}</p>` : ''}
        ${d.image ? `<img src="${d.image}" alt="Post image" class="post-image">` : ''}
      </div>
      <div class="post-stats">
        <span class="likes">${formatCount(d.likes || 0)} ${ui.likes}</span>
        <span class="comments">${formatCount(d.commentCount || 0)} ${ui.comments}</span>
      </div>
      <div class="post-actions">
        <button class="action-btn like-btn ${d.likedBy?.includes(currentUser.uid) ? 'liked' : ''}" 
                onclick="window.likePost('${id}', ${d.likedBy?.includes(currentUser.uid) ? 'true' : 'false'}, '${coll}')">
          <i class="fas fa-heart"></i> ${ui.like}
        </button>
        <button class="action-btn comment-btn" onclick="toggleCommentBox('${id}')">
          <i class="fas fa-comment"></i> ${ui.comment}
        </button>
      </div>
      <div class="comments-section" id="comments-${id}" style="display:none;">
        <div class="comment-input">
          <input type="text" placeholder="${ui.writeComment}" class="comment-text" id="comment-input-${id}">
          <button onclick="window.postComment('${id}', '${coll}', '${currentUser.uid}', document.getElementById('comment-input-${id}').value, null)">${ui.post}</button>
        </div>
        <div class="comments-list" id="comments-list-${id}"></div>
      </div>
    </div>
  `;
  
  // Add toggleCommentBox function to window if it doesn't exist
  if (!window.toggleCommentBox) {
    window.toggleCommentBox = function(postId) {
      const commentsSection = document.getElementById(`comments-${postId}`);
      commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    };
  }
  
  return container;
}

export function createMarketBreak(listings, ui) {
  const container = document.createElement('div');
  container.className = 'market-break';
  container.innerHTML = `
    <div class="market-header">
      <h3>${ui.marketTitle}</h3>
    </div>
    <div class="market-items">
      ${listings.slice(0, 5).map(item => `
        <div class="market-item">
          <img src="${item.image}" alt="${item.title}" class="market-image">
          <div class="market-details">
            <h4>${item.title}</h4>
            <p>${item.description}</p>
            <div class="price">${item.price} ${ui.currency}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return container;
}

// Additional helper functions that might be needed
export function createTopicItem(topic, ui) {
  const container = document.createElement('div');
  container.className = 'topic-item';
  container.innerHTML = `
    <div class="topic-header">
      <h3>${topic.title}</h3>
      <span class="topic-count">${topic.count || 0} posts</span>
    </div>
    <p>${topic.description}</p>
  `;
  return container;
}
