import sys
import typer
import threading
import time
from datetime import datetime

from rich.table import Table
from rich.prompt import Prompt
from rich.rule import Rule
from rich import box

from client.ui import show_welcome, console
from client import api_client, session

app = typer.Typer()


def format_time(timestamp_str: str) -> str:
    """Format an ISO timestamp string as HH:MM."""

    try:
        clean_str = timestamp_str.split(".")[0].replace("Z", "")
        dt = datetime.fromisoformat(clean_str)
        return dt.strftime("%H:%M")
    except Exception:
        return datetime.now().strftime("%H:%M")


def print_message(time_str: str, username: str, content: str, is_me: bool):
    """Render a single chat message in the console."""

    if is_me:
        console.print(f"[dim]\[{time_str}][/dim] [bold green]🟢 You:[/bold green] {content}")
    else:
        console.print(f"[dim]\[{time_str}][/dim] [bold cyan]👤 {username}:[/bold cyan] {content}")


def chat_window(recipient_id: int, recipient_username: str):
    """Display a chat window and poll for new messages."""

    console.clear()
    console.print(Rule(title=f"💬 Chat: [bold]{recipient_username}[/bold]", style="cyan"))
    console.print("[dim]Type [bold red]/exit[/bold red] to leave[/dim]", justify="center")
    console.print(Rule(style="dim"))
    console.print()

    token = session.load_token()
    last_msg_id = 0
    in_chat = True

    with console.status("[bold yellow]Loading history...[/bold yellow]"):
        history_result = api_client.get_messages(recipient_id, token)

    if history_result["success"] and history_result["data"]:
        for msg in history_result["data"]:
            time_str = format_time(msg["timestamp"])
            is_me = (msg["sender_id"] != recipient_id)
            print_message(time_str, recipient_username, msg["content"], is_me)
            last_msg_id = msg["id"]
    elif not history_result["data"]:
        console.print("[dim italic text-center]No messages yet. Send the first one![/dim italic text-center]\n")

    def poll_messages():
        nonlocal last_msg_id
        while in_chat:
            time.sleep(1.5)
            res = api_client.get_messages(recipient_id, token, last_msg_id)
            if res["success"] and res["data"]:
                for msg in res["data"]:
                    if msg["sender_id"] == recipient_id:
                        time_str = format_time(msg["timestamp"])
                        sys.stdout.write("\033[2K\r")
                        sys.stdout.flush()
                        print_message(time_str, recipient_username, msg["content"], False)
                        sys.stdout.write("\033[92m✎ You: \033[0m")
                        sys.stdout.flush()
                    last_msg_id = msg["id"]

    receiver_thread = threading.Thread(target=poll_messages, daemon=True)
    receiver_thread.start()

    console.print()
    while True:
        try:
            message_text = input("\033[92m✎ You: \033[0m")
            if message_text.strip() == "/exit":
                in_chat = False
                break
            if message_text.strip() != "":
                sys.stdout.write("\033[1A\033[2K\r")
                time_str = datetime.now().strftime("%H:%M")
                print_message(time_str, "", message_text, True)
                send_result = api_client.send_message(recipient_id, message_text, token)
                if not send_result["success"]:
                    console.print(f"[bold red]❌ Send error:[/bold red] {send_result['error']}")
        except KeyboardInterrupt:
            in_chat = False
            break

    chat_menu()


def chat_menu():
    """Display the main chat menu after login."""

    console.clear()
    console.print(Rule(title="[bold magenta]MAIN MENU[/bold magenta]", style="magenta"))
    console.print()

    console.print("  [bold cyan]1.[/bold cyan] Search contact")
    console.print("  [bold cyan]2.[/bold cyan] My chats [dim](Coming soon)[/dim]")
    console.print("  [bold red]3.[/bold red] Log out\n")

    choice = Prompt.ask("👉 Choose action", choices=["1", "2", "3"])

    if choice == "1":
        query = Prompt.ask("\n[bold]Enter username or part of it[/bold]")
        token = session.load_token()

        with console.status("[bold yellow]Searching database...[/bold yellow]"):
            result = api_client.search_users(query, token)

        if result["success"]:
            users = result["data"]
            if not users:
                console.print("\n[yellow]🤷‍♂️ No users found.[/yellow]")
                input("\nPress Enter to return...")
                chat_menu()
            else:
                table = Table(
                    title=f"🔍 Search results: [bold]'{query}'[/bold]",
                    box=box.ROUNDED,
                    header_style="bold cyan",
                    title_justify="left"
                )
                table.add_column("ID", justify="right", style="cyan", no_wrap=True)
                table.add_column("Username", style="magenta")

                for u in users:
                    table.add_row(str(u["id"]), u["username"])

                console.print("\n")
                console.print(table)
                console.print("\n[dim]Enter the contact ID to start chat (or 0 to cancel):[/dim]")
                target_id_str = Prompt.ask("Contact ID", default="0")

                if target_id_str != "0" and target_id_str.isdigit():
                    target_id = int(target_id_str)
                    target_user = next((u for u in users if u["id"] == target_id), None)
                    if target_user:
                        chat_window(target_user["id"], target_user["username"])
                    else:
                        console.print("[bold red]❌ User with this ID not found.[/bold red]")
                        input("\nPress Enter to return...")
                        chat_menu()
                else:
                    chat_menu()
        else:
            console.print(f"\n[bold red]❌ Error:[/bold red] {result['error']}")
            if "Session expired" in result["error"]:
                session.clear_token()
                raise typer.Exit()

    elif choice == "2":
        console.print("\n[yellow]Chat list will appear here...[/yellow]")
        input("\nPress Enter to return...")
        chat_menu()
    elif choice == "3":
        session.clear_token()
        console.print("\n[bold green]✅ You have successfully logged out![/bold green]")
        raise typer.Exit()


@app.command()
def start():
    """Start the client application."""

    token = session.load_token()
    if token:
        chat_menu()
        return

    show_welcome()

    console.print("  [bold cyan]1.[/bold cyan] Login")
    console.print("  [bold cyan]2.[/bold cyan] Register")
    console.print("  [bold red]3.[/bold red] Exit\n")

    choice = Prompt.ask("👉 Choose action", choices=["1", "2", "3"])

    if choice == "1":
        username = Prompt.ask("Username")
        password = Prompt.ask("Password", password=True)

        with console.status("[bold yellow]Connecting to server...[/bold yellow]"):
            result = api_client.login_user(username, password)

        if result["success"]:
            token = result["data"]["access_token"]
            session.save_token(token)
            console.print("\n[bold green]✅ Login successful![/bold green]")
            time.sleep(1)
            chat_menu()
        else:
            console.print(f"\n[bold red]❌ Error:[/bold red] {result['error']}")

    elif choice == "2":
        username = Prompt.ask("Choose a username")
        password = Prompt.ask("Choose a password", password=True)

        with console.status("[bold yellow]Creating account...[/bold yellow]"):
            result = api_client.register_user(username, password)

        if result["success"]:
            console.print("\n[bold green]✅ Account created! Restart the app to sign in.[/bold green]")
        else:
            console.print(f"\n[bold red]❌ Error:[/bold red] {result['error']}")

    elif choice == "3":
        console.print("\n[bold red]Goodbye![/bold red]")
        raise typer.Exit()


if __name__ == "__main__":
    app()