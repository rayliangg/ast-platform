"""Backend service demo: base repository, concrete repo, and orchestrating service."""

import os
from pathlib import Path


class Repository:
    """Generic persistence boundary (subclasses implement store/load)."""

    def __init__(self, name: str) -> None:
        self.name = name

    def label(self) -> str:
        return f"{self.name}-repo"

    def store(self, key: str, payload: dict) -> None:
        raise NotImplementedError

    def load(self, key: str) -> dict | None:
        raise NotImplementedError


class InMemoryUserRepository(Repository):
    """Simple in-memory users; inherits Repository and fills abstract hooks."""

    def __init__(self) -> None:
        super().__init__("user")
        self._data: dict[str, dict] = {}

    def store(self, key: str, payload: dict) -> None:
        self._data[key] = dict(payload)

    def load(self, key: str) -> dict | None:
        return self._data.get(key)


class UserService:
    """Application service using a repository; methods live under the class."""

    def __init__(self, repo: Repository | None = None) -> None:
        self.repo = repo or InMemoryUserRepository()

    def create_user(self, name: str) -> dict:
        """Create user payload and persist under a synthetic id."""
        user_id = name.lower().replace(" ", "-")
        body = {"name": name, "cwd": os.getcwd(), "repo": self.repo.label()}
        self.repo.store(user_id, body)
        return {"id": user_id, **body}

    def get_user(self, user_id: str) -> dict | None:
        return self.repo.load(user_id)


def health_path() -> Path:
    """Module-level helper for demo trees."""
    return Path(__file__).resolve().parent
