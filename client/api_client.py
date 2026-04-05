import httpx

BASE_URL = "https://safely-chat.vercel.app"

def register_user(username: str, password: str) -> dict:
    """Send a user registration request to the API."""

    url = f"{BASE_URL}/register"
    payload = {"username": username, "password": password}

    try:
        response = httpx.post(url, json=payload)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except httpx.HTTPStatusError as e:
        error_msg = e.response.json().get("detail", "Registration error")
        return {"success": False, "error": error_msg}
    except Exception:
        return {"success": False, "error": "Server unavailable. Check FastAPI."}


def login_user(username: str, password: str) -> dict:
    """Send a login request and return the access token."""

    url = f"{BASE_URL}/login"
    payload = {"username": username, "password": password}

    try:
        response = httpx.post(url, data=payload)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except httpx.HTTPStatusError:
        return {"success": False, "error": "Invalid username or password"}
    except Exception:
        return {"success": False, "error": "Server unavailable. Check FastAPI."}


def search_users(query: str, token: str) -> dict:
    """Search users by query using the authorization token."""

    url = f"{BASE_URL}/users/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query}

    try:
        response = httpx.get(url, headers=headers, params=params)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return {"success": False, "error": "Session expired. Please log in again."}
        return {"success": False, "error": f"Server error: {e.response.status_code}"}
    except Exception:
        return {"success": False, "error": "Server unavailable. Check FastAPI."}


def get_messages(contact_id: int, token: str, last_message_id: int = 0) -> dict:
    """Retrieve chat history or only new messages since last_message_id."""

    url = f"{BASE_URL}/messages/{contact_id}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"last_message_id": last_message_id}

    try:
        response = httpx.get(url, headers=headers, params=params)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_message(receiver_id: int, content: str, token: str) -> dict:
    """Send a new message to a contact."""

    url = f"{BASE_URL}/messages"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"receiver_id": receiver_id, "content": content}

    try:
        response = httpx.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}