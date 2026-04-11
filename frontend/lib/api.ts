// frontend/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class ApiClient {
  // Get auth token from browser storage
  private getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Attach Bearer token if available (skips login endpoint)
    if (token && endpoint !== '/token') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Extract FastAPI error detail if present, otherwise fallback to status text.
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText || 'Server error');
    }

    return response.json();
  }

  // --- API Endpoints ---
  
  async login(username: string, password: string) {
    // Uses Form Data for OAuth2
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const data = await this.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
    }
    return data;
  }

  async getMe() {
    return this.request('/users/me');
  }

  async getChats() {
    return this.request('/chats');
  }

  async getMessages(contactId: number, lastMessageId: number = 0) {
    return this.request(`/messages/${contactId}?last_message_id=${lastMessageId}`);
  }

  async sendMessage(receiverId: number, content: string) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, content }),
    });
  }

  async searchUsers(query: string) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }
  
  async deleteMessage(messageId: number) {
    return this.request(`/messages/${messageId}`, { method: 'DELETE' });
  }

  async markAsRead(contactId: number) {
    return this.request(`/messages/read/${contactId}`, { method: 'POST' });
  }
}

// Fetches current user profile
export const api = new ApiClient();