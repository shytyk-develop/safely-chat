from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich import box

console = Console()


def show_welcome():
    """Render the welcome screen for the terminal client."""

    console.clear()

    title = Text("SUPERCHAT", style="bold cyan", justify="center")
    subtitle = Text("Terminal client v1.0\nSecure and fast messaging", style="dim", justify="center")

    content = Text.assemble(title, "\n\n", subtitle)
    panel = Panel(
        content,
        border_style="cyan",
        box=box.ROUNDED,
        padding=(1, 4),
        expand=False
    )

    console.print(panel, justify="center")
    console.print()