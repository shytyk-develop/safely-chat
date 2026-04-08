const BASE_URL = "https://safely-chat.vercel.app";

let token = localStorage.getItem("token");
let currentChatUserId = null;
let currentChatUsername = "";
let pollInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-btn").addEventListener("click", login);
    document.getElementById("register-btn").addEventListener("click", register);
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("search-btn").addEventListener("click", searchUsers);
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    
    document.getElementById("message-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    if (token) {
        switchScreen('dashboard-screen');
        loadMyChats();
    }
});

// === Screen Navigation ===
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// === Authorization ===
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    
    if (!user || !pass) {
        errorEl.innerText = "Please enter username and password.";
        return;
    }

    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);

    try {
        errorEl.innerText = "Connecting...";
        const res = await fetch(`${BASE_URL}/login`, { method: "POST", body: formData });
        
        if (res.ok) {
            const data = await res.json();
            token = data.access_token;
            localStorage.setItem("token", token); 
            errorEl.innerText = "";
            document.getElementById('username').value = "";
            document.getElementById('password').value = "";
            switchScreen('dashboard-screen');
            loadMyChats();
        } else {
            errorEl.innerText = "Invalid username or password!";
        }
    } catch (err) {
        errorEl.innerText = "Server connection error.";
    }
}

// === Register ===
async function register() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    if (!user || !pass) {
        errorEl.innerText = "Please enter username and password.";
        return;
    }

    try {
        errorEl.style.color = "#333";
        errorEl.innerText = "Registering...";

        const res = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (res.ok) {
            errorEl.style.color = "green";
            errorEl.innerText = "Success! Logging you in...";
            setTimeout(login, 1000); 
        } else {
            const data = await res.json();
            errorEl.style.color = "#dc3545"; 
            errorEl.innerText = data.detail || "User already exists!";
        }
    } catch (err) {
        errorEl.style.color = "#dc3545";
        errorEl.innerText = "Server connection error.";
    }
}

function logout() {
    token = null;
    localStorage.removeItem("token");
    clearInterval(pollInterval);
    switchScreen('auth-screen');
}

// === Menu n Search ===
async function searchUsers() {
    const q = document.getElementById('search-query').value;
    const ul = document.getElementById('search-results');
    ul.innerHTML = "";

    if (!q) return;

    const res = await fetch(`${BASE_URL}/users/search?q=${q}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();

    const users = await res.json();

    if (users.length === 0) {
        ul.innerHTML = "<li style='color: #666;'>No users found.</li>";
        return;
    }

    users.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${u.username}</span>`;

        const chatBtn = document.createElement('button');
        chatBtn.innerText = "Chat";
        chatBtn.onclick = () => {
            startChat(u.id, u.username);
            ul.innerHTML = ""; 
            document.getElementById('search-query').value = ""; 
        };

        li.appendChild(chatBtn);
        ul.appendChild(li);
    });
}

// === Chat n Messages ===
function startChat(userId, username) {
    currentChatUserId = userId;
    currentChatUsername = username;

    //document.getElementById('chat-title').innerText = username;
    document.getElementById('messages-container').innerHTML = "";
    document.getElementById('message-input').value = "";

    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('chat-area').style.display = 'flex';

    switchScreen('dashboard-screen');

    clearInterval(pollInterval); 
    fetchMessages();
    pollInterval = setInterval(fetchMessages, 1500);
}

function goBackToMenu() {
    clearInterval(pollInterval); 
    currentChatUserId = null;
    switchScreen('menu-screen');
}

async function fetchMessages() {
    if (!currentChatUserId) return;

    const res = await fetch(`${BASE_URL}/messages/${currentChatUserId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.status === 401) return logout();

    const messages = await res.json();
    const container = document.getElementById('messages-container');

    const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 10;
    const currentScroll = container.scrollTop;

    container.innerHTML = ""; 
    
    if (messages.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#999; margin-top:20px; font-size:14px;'>Say 'hi' to start the conversation!</div>";
        return;
    }

    messages.forEach(msg => {
        const div = document.createElement('div');
        const isMe = msg.sender_id !== currentChatUserId;
        
        div.className = `message ${isMe ? 'msg-me' : 'msg-them'}`;
        div.innerText = msg.content;
        container.appendChild(div);
    });
    
    if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
    } else {
        container.scrollTop = currentScroll;
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${BASE_URL}/messages`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${token}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ receiver_id: currentChatUserId, content: text })
        });
        
        if (res.ok) {
            input.value = ""; 
            fetchMessages(); 
        } else {
            const errorData = await res.json();
            console.error("❌ Server error:", errorData);
            alert("Could not send.");
        }
    } catch (err) {
        console.error("❌ Network/CORS Issue:", err);
    }
}

// === Sidebar Chat Load ===
async function loadMyChats() {
    const ul = document.getElementById('chat-list');
    
    try {
        const res = await fetch(`${BASE_URL}/chats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout();
        
        const chats = await res.json();
        ul.innerHTML = ""; 
        
        if (chats.length === 0) {
            ul.innerHTML = "<div class='empty-text'>No active chats. Use search to find users!</div>";
            return;
        }

        chats.forEach(u => {
            const li = document.createElement('li');
            li.style.padding = "12px 15px";
            li.style.borderBottom = "1px solid #eee";
            li.style.cursor = "pointer";
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.transition = "background-color 0.2s";
            
            li.onmouseover = () => li.style.backgroundColor = "#f8f9fa";
            li.onmouseout = () => li.style.backgroundColor = "transparent";

            const avatar = document.createElement('div');
            avatar.innerText = u.username.charAt(0).toUpperCase();
            avatar.style.width = "36px";
            avatar.style.height = "36px";
            avatar.style.borderRadius = "50%";
            avatar.style.backgroundColor = "#007bff";
            avatar.style.color = "white";
            avatar.style.display = "flex";
            avatar.style.justifyContent = "center";
            avatar.style.alignItems = "center";
            avatar.style.marginRight = "12px";
            avatar.style.flexShrink = "0";

            const nameSpan = document.createElement('span');
            nameSpan.innerText = u.username;
            nameSpan.style.fontWeight = "bold";

            li.onclick = () => {
                startChat(u.id, u.username);
                document.getElementById('search-results').innerHTML = ""; 
                document.getElementById('search-query').value = "";
            };

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            ul.appendChild(li);
        });
    } catch (err) {
        console.error("Error loading chats:", err);
    }
}