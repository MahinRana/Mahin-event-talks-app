// Global State
let releasesData = [];
let selectedUpdates = [];
let activeFilter = 'all';
let searchTerm = '';
let currentTweetText = '';

// DOM Elements
const notesList = document.getElementById('notes-list');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const updateCountText = document.getElementById('update-count-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterTags = document.querySelectorAll('.filter-tag');
const retryBtn = document.getElementById('retry-btn');

// Selection Bar Elements
const selectionBar = document.getElementById('selection-bar');
const selectedCountSpan = document.getElementById('selected-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgress = document.getElementById('char-progress');
const charCount = document.getElementById('char-count');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const modalWarningText = document.getElementById('modal-warning-text');

// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
        ? '<i class="fa-solid fa-circle-check"></i>' 
        : '<i class="fa-solid fa-circle-exclamation"></i>';
        
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);
    
    // Remove after 3.5s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Fetch Release Notes
async function fetchReleaseNotes() {
    try {
        // Show loading state
        loadingState.style.display = 'flex';
        notesList.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Unknown error fetching release notes');
        }
        
        releasesData = data.releases;
        
        // Update metadata
        lastUpdatedText.textContent = `Last synced: ${data.fetched_at || 'Just now'}`;
        
        // Reset selections
        selectedUpdates = [];
        updateSelectionBar();
        
        // Render
        renderReleases();
        showToast('Successfully updated BigQuery Release Notes.');
    } catch (err) {
        console.error(err);
        errorMessage.textContent = err.message || 'Connection timed out or network error.';
        errorState.style.display = 'flex';
        loadingState.style.display = 'none';
        showToast('Failed to fetch release notes.', 'error');
    } finally {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Format Tweet Text helper
function generateTweetText(updateObj) {
    const dateText = updateObj.date;
    const type = updateObj.type.toUpperCase();
    const content = updateObj.content_text;
    const link = updateObj.link;
    
    // Build a nice concise tweet
    let tweet = `📢 BigQuery Update (${dateText})\n\n`;
    tweet += `🔹 [${type}] ${content}\n\n`;
    
    if (link) {
        tweet += `Read more: ${link}`;
    } else {
        tweet += `Read more: https://cloud.google.com/bigquery/docs/release-notes`;
    }
    
    return tweet;
}

// Generate combined tweet for selected updates
function generateCombinedTweetText(updates) {
    let tweet = `📢 BigQuery Updates Summary:\n\n`;
    
    updates.forEach((up, index) => {
        // Add item prefix
        const type = up.type.toUpperCase();
        let text = up.content_text;
        
        // Truncate individual items if we are combining many to fit tweet limits
        if (text.length > 100) {
            text = text.substring(0, 97) + '...';
        }
        
        tweet += `• [${type}] ${text}\n`;
    });
    
    tweet += `\n🔗 Release Notes: https://cloud.google.com/bigquery/docs/release-notes`;
    return tweet;
}

// Render Release Notes with current Search and Filter
function renderReleases() {
    notesList.innerHTML = '';
    let visibleUpdatesCount = 0;
    
    releasesData.forEach((release, dateIndex) => {
        // Filter updates in this release
        const filteredUpdates = release.updates.filter(update => {
            // Filter by type
            const matchesType = activeFilter === 'all' || 
                update.type.toLowerCase() === activeFilter;
                
            // Filter by search
            const matchesSearch = searchTerm === '' || 
                update.type.toLowerCase().includes(searchTerm) || 
                update.content_text.toLowerCase().includes(searchTerm) ||
                release.date.toLowerCase().includes(searchTerm);
                
            return matchesType && matchesSearch;
        });
        
        if (filteredUpdates.length === 0) return;
        
        // Create Date Group Container
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Date Header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        
        const bullet = document.createElement('div');
        bullet.className = 'date-bullet';
        
        const title = document.createElement('h2');
        title.className = 'date-title';
        title.textContent = release.date;
        
        dateHeader.appendChild(bullet);
        dateHeader.appendChild(title);
        
        if (release.link) {
            const dateLink = document.createElement('a');
            dateLink.className = 'date-link';
            dateLink.href = release.link;
            dateLink.target = '_blank';
            dateLink.title = 'View official GCP release notes for this day';
            dateLink.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i>';
            dateHeader.appendChild(dateLink);
        }
        
        dateGroup.appendChild(dateHeader);
        
        // Append cards
        filteredUpdates.forEach((update, updateIndex) => {
            visibleUpdatesCount++;
            
            // Unique key for state tracking
            const updateKey = `${dateIndex}_${updateIndex}`;
            const isSelected = selectedUpdates.some(s => s.key === updateKey);
            
            // Card element
            const card = document.createElement('div');
            card.className = `update-card ${isSelected ? 'selected' : ''}`;
            card.dataset.key = updateKey;
            
            // Generate card contents
            const typeClass = `type-${update.type.toLowerCase()}`;
            
            // Card Header
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const typeCheckboxWrapper = document.createElement('div');
            typeCheckboxWrapper.className = 'card-type-checkbox';
            
            const checkbox = document.createElement('div');
            checkbox.className = 'custom-checkbox';
            checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card body click if we put listener there
                toggleSelectUpdate(updateKey, update, release.date, release.link);
            });
            
            const tag = document.createElement('span');
            tag.className = `type-tag ${typeClass}`;
            
            // Add custom icons for tags
            let tagIcon = '<i class="fa-solid fa-cubes"></i> ';
            if (update.type.toLowerCase() === 'feature') tagIcon = '<i class="fa-solid fa-star"></i> ';
            if (update.type.toLowerCase() === 'issue') tagIcon = '<i class="fa-solid fa-circle-exclamation"></i> ';
            if (update.type.toLowerCase() === 'deprecation') tagIcon = '<i class="fa-solid fa-trash-can"></i> ';
            
            tag.innerHTML = `${tagIcon}${update.type}`;
            
            typeCheckboxWrapper.appendChild(checkbox);
            typeCheckboxWrapper.appendChild(tag);
            
            const cardActions = document.createElement('div');
            cardActions.className = 'card-actions';
            
            // Copy description button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.title = 'Copy update text';
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(update.content_text);
                showToast('Copied release note text to clipboard.');
            });
            
            // Tweet button
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'action-btn tweet-btn';
            tweetBtn.title = 'Tweet this update';
            tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i>';
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(generateTweetText({
                    date: release.date,
                    type: update.type,
                    content_text: update.content_text,
                    link: release.link
                }));
            });
            
            cardActions.appendChild(copyBtn);
            cardActions.appendChild(tweetBtn);
            
            cardHeader.appendChild(typeCheckboxWrapper);
            cardHeader.appendChild(cardActions);
            
            // Card Body
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            cardBody.innerHTML = update.content_html;
            
            // Check box toggle when clicking card background
            card.addEventListener('click', () => {
                toggleSelectUpdate(updateKey, update, release.date, release.link);
            });
            
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            dateGroup.appendChild(card);
        });
        
        notesList.appendChild(dateGroup);
    });
    
    // Update stats
    updateCountText.textContent = `${visibleUpdatesCount} update(s) found`;
    
    // Toggle displays
    if (visibleUpdatesCount === 0) {
        emptyState.style.display = 'flex';
        notesList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        notesList.style.display = 'flex';
    }
    
    loadingState.style.display = 'none';
}

// Toggle selection
function toggleSelectUpdate(key, update, date, link) {
    const index = selectedUpdates.findIndex(s => s.key === key);
    const card = document.querySelector(`.update-card[data-key="${key}"]`);
    
    if (index > -1) {
        // remove
        selectedUpdates.splice(index, 1);
        if (card) card.classList.remove('selected');
    } else {
        // add
        selectedUpdates.push({
            key,
            type: update.type,
            content_text: update.content_text,
            date,
            link
        });
        if (card) card.classList.add('selected');
    }
    
    updateSelectionBar();
}

// Update floating selection action bar
function updateSelectionBar() {
    const count = selectedUpdates.length;
    selectedCountSpan.textContent = count;
    
    if (count > 0) {
        selectionBar.classList.add('active');
    } else {
        selectionBar.classList.remove('active');
    }
}

// Open Tweet Composer Modal
function openTweetComposer(text) {
    currentTweetText = text;
    tweetTextarea.value = text;
    updateTweetStats();
    
    tweetModal.classList.add('active');
    // Autofocus textarea
    setTimeout(() => tweetTextarea.focus(), 100);
}

// Close Tweet Composer Modal
function closeTweetComposer() {
    tweetModal.classList.remove('active');
}

// Character Count and Live Preview Handler
function updateTweetStats() {
    const text = tweetTextarea.value;
    const charLimit = 280;
    
    // Add hashtag default length if we count it
    const tag = " #BigQuery";
    const totalLength = text.length + tag.length;
    const charLeft = charLimit - totalLength;
    
    charCount.textContent = charLeft >= 0 ? charLeft : charLeft;
    
    // Preview Content Update
    tweetPreviewText.textContent = text;
    
    // Update circular progress bar
    const percentage = Math.min(100, Math.max(0, (totalLength / charLimit) * 100));
    
    // conic-gradient angle styling
    charProgress.style.setProperty('--progress', `${percentage * 3.6}deg`);
    charProgress.style.background = `conic-gradient(var(--progress-color, var(--primary)) ${percentage * 3.6}deg, rgba(255,255,255,0.05) 0deg)`;
    
    // Set colors and warning messages
    if (charLeft < 0) {
        charProgress.style.setProperty('--progress-color', 'var(--deprecation-color)');
        charCount.style.color = 'var(--deprecation-color)';
        publishTweetBtn.disabled = true;
        modalWarningText.textContent = "Tweet exceeds standard character limit (280 characters).";
    } else if (charLeft <= 20) {
        charProgress.style.setProperty('--progress-color', 'var(--issue-color)');
        charCount.style.color = 'var(--issue-color)';
        publishTweetBtn.disabled = false;
        modalWarningText.textContent = "";
    } else {
        charProgress.style.setProperty('--progress-color', 'var(--primary)');
        charCount.style.color = 'var(--text-secondary)';
        publishTweetBtn.disabled = text.trim() === '';
        modalWarningText.textContent = "";
    }
}

// Publish/Post to Twitter using Web Intent
function postToTwitter() {
    const text = tweetTextarea.value;
    const tag = " #BigQuery";
    const fullTweetText = text + tag;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullTweetText)}`;
    
    // Open in new window
    window.open(intentUrl, '_blank', 'width=550,height=420,toolbar=no,location=no,status=no,menubar=no');
    
    closeTweetComposer();
    showToast('Redirected to Twitter to publish your tweet.');
}

// Event Listeners
refreshBtn.addEventListener('click', fetchReleaseNotes);
retryBtn.addEventListener('click', fetchReleaseNotes);

// Search Input Listener
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    
    // Show/hide clear button
    if (searchTerm.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    renderReleases();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    clearSearchBtn.style.display = 'none';
    renderReleases();
});

// Filter Tabs Click Listener
filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
        // Remove active class from all
        filterTags.forEach(t => t.classList.remove('active'));
        
        // Add to clicked
        tag.classList.add('active');
        activeFilter = tag.dataset.type;
        
        renderReleases();
    });
});

// Selection actions
clearSelectionBtn.addEventListener('click', () => {
    selectedUpdates = [];
    document.querySelectorAll('.update-card.selected').forEach(c => {
        c.classList.remove('selected');
    });
    updateSelectionBar();
});

tweetSelectedBtn.addEventListener('click', () => {
    if (selectedUpdates.length === 0) return;
    
    const combinedText = generateCombinedTweetText(selectedUpdates);
    openTweetComposer(combinedText);
});

// Modal Events
closeModalBtn.addEventListener('click', closeTweetComposer);
cancelTweetBtn.addEventListener('click', closeTweetComposer);
tweetTextarea.addEventListener('input', updateTweetStats);
publishTweetBtn.addEventListener('click', postToTwitter);

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target === tweetModal) {
        closeTweetComposer();
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
});
