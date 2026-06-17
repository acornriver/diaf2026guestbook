// Web Audio Synthesizer for Poetic Metallic Sound Effects
const AudioSynth = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    // Soft high-frequency metallic tick (for hover and selection)
    clink() {
        this.init();
        if (!this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1600, now);
            osc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);
            
            gain.gain.setValueAtTime(0.008, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    },
    // Resonant iron plate chime (for successful submission)
    strike() {
        this.init();
        if (!this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            
            // Generate multiple inharmonic partials to simulate hitting a piece of iron
            const playPartial = (freq, vol, decay) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                // Use triangle for a slightly warmer, physical resonance
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(now);
                osc.stop(now + decay);
            };
            
            // Poetic metal chime chord formula
            playPartial(180, 0.08, 0.8);  // Deep rumble / fundamental
            playPartial(380, 0.04, 0.5);  // Harmonic 1
            playPartial(670, 0.03, 0.4);  // Inharmonic chime 1
            playPartial(920, 0.02, 0.3);  // Inharmonic chime 2
            playPartial(1450, 0.01, 0.15); // High metallic ring
        } catch (e) {
            // Audio context blocked or unsupported
        }
    }
};

// Document Elements
const body = document.body;
const liveClock = document.getElementById('live-clock');
const charCurrent = document.getElementById('char-current');
const messageInput = document.getElementById('message-input');
const nameInput = document.getElementById('name-input');
const guestbookForm = document.getElementById('guestbook-form');
const submitBtn = document.getElementById('submit-btn');
const messagesFeed = document.getElementById('messages-feed');
const demoIndicator = document.getElementById('demo-indicator');
const refreshIndicator = document.getElementById('refresh-indicator');

let isFetching = false;
let currentMessagesHash = ""; // To prevent unnecessary list redraws if data is identical

// Initialize Clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    if (liveClock) {
        liveClock.textContent = `${hours}:${minutes}:${seconds}`;
    }
}
setInterval(updateClock, 1000);
updateClock();

// Textarea Character Count
if (messageInput) {
    messageInput.addEventListener('input', () => {
        const count = messageInput.value.length;
        charCurrent.textContent = count;
        if (count >= 200) {
            charCurrent.style.color = 'var(--accent-color)';
        } else {
            charCurrent.style.color = '';
        }
    });
}

// Vibe listeners removed (Unified theme active)

// Subtle tick on button hover
if (submitBtn) {
    submitBtn.addEventListener('mouseenter', () => {
        AudioSynth.clink();
    });
}

// Toast Helper
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    
    toast.className = `toast ${type}`;
    toastMsg.innerText = message;
    
    // Smooth transition
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// Helper to escape HTML tags to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Format date nicely (YYYY. MM. DD. HH:MM)
function formatDateString(dateStr) {
    if (!dateStr) return '';
    try {
        // Expected formats: YYYY-MM-DD HH:MM:SS or Google format
        // Replace dashes with dots for clean artistic typography
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
            const dateParts = parts[0].split('-');
            const timeParts = parts[1].split(':');
            if (dateParts.length === 3 && timeParts.length >= 2) {
                return `${dateParts[0]}. ${dateParts[1]}. ${dateParts[2]}.  ${timeParts[0]}:${timeParts[1]}`;
            }
        }
        
        // Fallback: try parsing as Date object
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            return `${y}. ${m}. ${d}.  ${hh}:${mm}`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

// Generate simple hash of messages to check if redraw is needed
function getMessagesHash(messages) {
    return messages.map(m => `${m.name}-${m.message}-${m.vibe}`).join('|');
}

// Render Messages
function renderMessages(messages) {
    if (!messagesFeed) return;
    
    // Sort chronological: we want the newest messages at the top!
    // Since we append rows to Google Sheets, they are retrieved in chronological order (oldest first).
    // So we reverse the array to show the latest messages first.
    const reversedMessages = [...messages].reverse();
    
    const hash = getMessagesHash(reversedMessages);
    if (hash === currentMessagesHash) {
        return; // Skip rendering if no updates
    }
    currentMessagesHash = hash;
    
    if (reversedMessages.length === 0) {
        messagesFeed.innerHTML = `
            <div class="feed-empty">
                아직 새겨진 흔적이 없습니다.<br>
                전시장의 첫 번째 마찰을 남겨보세요.
            </div>
        `;
        return;
    }
    
    messagesFeed.innerHTML = '';
    
    reversedMessages.forEach((msg, index) => {
        const card = document.createElement('div');
        const vibe = escapeHTML(msg.vibe || 'ore');
        card.className = `message-card card-vibe-${vibe}`;
        
        // Add subtle animation delay for staggering fade-in effect
        // Stagger only the first few to keep page loading snappy
        const delay = index < 10 ? `${index * 0.08}s` : '0s';
        card.style.animationDelay = delay;
        
        const displayName = escapeHTML(msg.name || '익명');
        const displayMessage = escapeHTML(msg.message || '');
        const displayDate = formatDateString(msg.timestamp);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-name">${displayName}</span>
                <span class="card-date">${displayDate}</span>
            </div>
            <div class="card-content">${displayMessage}</div>
        `;
        
        // Play clink sound on card hover
        card.addEventListener('mouseenter', () => {
            AudioSynth.clink();
        });
        
        messagesFeed.appendChild(card);
    });
}

// Google Sheets API Web App URL & Local Mock Data for Demo Fallback
let sheetApiUrl = "";
let DEMO_MESSAGES = [
    {
        "timestamp": "2026-06-17 18:00:21",
        "name": "우쥬인간",
        "message": "철의 언어가 결국 여러분의 언어로 번역되었으면 좋겠습니다. 찾아주셔서 감사드립니다.",
        "vibe": "ore"
    },
    {
        "timestamp": "2026-06-17 18:12:45",
        "name": "정소윤",
        "message": "차가운 철판에서 뿜어져 나오는 시각적인 에너지와 소리가 온몸으로 전해지네요. 특히 쇳물의 뜨거운 빛을 담은 듯한 붉은 광원이 인상 깊었습니다.",
        "vibe": "steel"
    },
    {
        "timestamp": "2026-06-17 18:24:02",
        "name": "이민재",
        "message": "담금질된 파란색 철의 미학... 날카로우면서도 정돈된 차가움이 긴 여운을 남깁니다. 아주 감각적인 전시예요.",
        "vibe": "blue"
    },
    {
        "timestamp": "2026-06-17 18:35:10",
        "name": "차은우",
        "message": "소리와 빛, 철의 마찰이 빚어내는 소음이 음악처럼 들렸습니다. 어두운 공간 속에서 홀로 빛나는 흔적들이 아름답습니다.",
        "vibe": "charcoal"
    }
];

// Load configuration from config.json (server config) or localStorage (local fallback)
async function initConfig() {
    // Check localStorage first (useful for local admin page setting test)
    const localUrl = localStorage.getItem('sheet_api_url');
    if (localUrl) {
        sheetApiUrl = localUrl.trim();
        return;
    }

    try {
        const res = await fetch('config.json');
        if (res.ok) {
            const data = await res.json();
            if (data && data.sheet_api_url) {
                sheetApiUrl = data.sheet_api_url.trim();
            }
        }
    } catch (e) {
        console.log("No config.json found or not running on web server. Using Demo Mode.");
    }
}

// Fetch Messages
function fetchMessages(isSilent = false) {
    if (isFetching) return;
    isFetching = true;
    
    if (!isSilent && messagesFeed) {
        if (messagesFeed.children.length === 0 || messagesFeed.querySelector('.feed-loading')) {
            messagesFeed.innerHTML = '<div class="feed-loading">흔적을 불러오는 중...</div>';
        }
    }
    
    if (refreshIndicator) {
        refreshIndicator.style.opacity = '0.8';
    }

    // Fallback: If no sheet API URL is configured, run in Demo Mode
    if (!sheetApiUrl) {
        setTimeout(() => {
            demoIndicator.classList.remove('hidden');
            demoIndicator.title = "구글 스프레드시트와 연동되어 있지 않아 로컬 데모 모드로 작동 중입니다.";
            renderMessages(DEMO_MESSAGES);
            isFetching = false;
            if (refreshIndicator) refreshIndicator.style.opacity = '0.4';
        }, 300);
        return;
    }

    // Direct client-to-GAS GET request
    fetch(sheetApiUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error("HTTP error: " + res.status);
            }
            return res.json();
        })
        .then(data => {
            demoIndicator.classList.add('hidden');
            renderMessages(data || []);
        })
        .catch(err => {
            console.error("Failed to fetch from Google Sheet directly:", err);
            // Fallback to Demo Mode so visitor interface never crashes
            demoIndicator.classList.remove('hidden');
            demoIndicator.title = "스프레드시트 연결 오류로 데모 모드 데이터가 표시됩니다.";
            renderMessages(DEMO_MESSAGES);
        })
        .finally(() => {
            isFetching = false;
            setTimeout(() => {
                if (refreshIndicator) refreshIndicator.style.opacity = '0.4';
            }, 1000);
        });
}

// Form Submission
if (guestbookForm) {
    guestbookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        AudioSynth.init();
        
        const name = nameInput.value.trim();
        const message = messageInput.value.trim();
        const vibe = "ore";
        
        if (!name || !message) {
            showToast("이름과 메시지를 모두 채워주세요.", "error");
            return;
        }
        
        AudioSynth.strike();
        
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').innerText;
        submitBtn.querySelector('.btn-text').innerText = "[ 흔적 새기는 중... ]";
        
        if (!sheetApiUrl) {
            // Local save for Demo Mode
            setTimeout(() => {
                const now = new Date();
                const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
                
                DEMO_MESSAGES.push({
                    timestamp: nowStr,
                    name: name,
                    message: message,
                    vibe: vibe
                });
                
                showToast("데모 모드로 흔적이 기록되었습니다.", "success");
                
                messageInput.value = '';
                nameInput.value = '';
                charCurrent.textContent = '0';
                
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').innerText = originalText;
                
                fetchMessages(true);
            }, 500);
            return;
        }

        // Direct POST to Google Apps Script
        // Use text/plain Content-Type to avoid CORS preflight OPTIONS request
        fetch(sheetApiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({ name, message, vibe })
        })
        .then(res => {
            // Since GAS redirect response body might be blocked by browser CORS policy,
            // we assume success if request completes, but try parsing json if possible.
            return res.json().catch(() => ({ result: 'success' }));
        })
        .then(data => {
            if (data.result === 'success') {
                showToast("흔적이 구글 스프레드시트에 새겨졌습니다.", "success");
                
                messageInput.value = '';
                nameInput.value = '';
                charCurrent.textContent = '0';
                
                fetchMessages(true);
            } else {
                showToast(data.error || "오류가 발생했습니다.", "error");
            }
        })
        .catch(err => {
            // Fallback: If network request went through but redirected body was blocked by CORS,
            // the entry was likely created anyway. We clear the form and attempt refresh.
            console.log("CORS redirect response blocked (ignoring as row is typically appended):", err);
            showToast("흔적이 구글 스프레드시트에 새겨졌습니다.", "success");
            
            messageInput.value = '';
            nameInput.value = '';
            charCurrent.textContent = '0';
            
            setTimeout(() => {
                fetchMessages(true);
            }, 1000);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').innerText = originalText;
        });
    });
}

// Initial Loading Wrapper
initConfig().then(() => {
    fetchMessages(false);
    
    // Poll for updates every 10 seconds
    setInterval(() => {
        fetchMessages(true);
    }, 10000);
});
