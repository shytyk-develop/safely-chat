import os

SESSION_FILE = ".session"

def save_token(token: str):
    """Save the access token to the local session file."""

    with open(SESSION_FILE, "w") as f:
        f.write(token)


def load_token():
    """Load the access token from the local session file if available."""

    if os.path.exists(SESSION_FILE):
        with open(SESSION_FILE, "r") as f:
            return f.read().strip()
    return None


def clear_token():
    """Delete the local session file to log out."""
    
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)