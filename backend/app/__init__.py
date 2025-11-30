"""Backend FastAPI application package.

This file ensures the local ``app`` module inside ``backend/`` is
treated as a package so imports like ``uvicorn backend.app.main:app``
resolve to this codebase instead of any unrelated installed package
named ``app``. Keeping it explicit prevents import errors such as
``ModuleNotFoundError: No module named 'config'`` when running the
development server.
"""

__all__ = ["main"]
