"""Demo for AST + gift: classes, inheritance, and module functions."""

import os
from pathlib import Path

from local_utils import helper


class ReportBuilder:
    """Base builder for structured reports."""

    def __init__(self, title: str) -> None:
        self.title = title

    def section(self, name: str, body: dict) -> dict:
        """Attach a named section to the report shell."""
        return {"title": self.title, "sections": {name: body}}

    def build(self) -> dict:
        """Default empty report."""
        return {"title": self.title, "sections": {}}


class GiftReportBuilder(ReportBuilder):
    """Specialized report for gift flows; overrides and extends the base."""

    def __init__(self, title: str, gift_code: str) -> None:
        super().__init__(title)
        self.gift_code = gift_code

    def build(self) -> dict:
        base = super().build()
        base["gift_code"] = self.gift_code
        base["hint"] = helper(f"gift:{self.gift_code}")
        return base

    def add_recipient(self, name: str) -> dict:
        """Compose a recipient block under the gift report."""
        return self.section("recipient", {"name": name, "via": "gift"})


class UserService:
    """Service class: constructor + instance methods below the class."""

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path.cwd()

    def create_user(self, name: str) -> dict:
        """Create a user payload."""
        return {"name": name, "cwd": os.getcwd(), "root": str(self.root)}

    def describe(self) -> str:
        """Short label for debugging."""
        return helper(f"UserService@{self.root.name or '.'}")


def build_report(user_id: str) -> dict:
    """Build a simple report structure (module-level function)."""
    return {"user_id": user_id, "ok": True}


def run_gift_demo() -> dict:
    """Tie together inheritance + service + helpers."""
    builder = GiftReportBuilder("Q4 gifts", "GIFT-100")
    report = builder.build()
    report["recipient_block"] = builder.add_recipient("Ada")
    svc = UserService()
    report["user"] = svc.create_user("Ada")
    report["service"] = svc.describe()
    return report
