"""Vercel entry point for the RAG chat API (rag_api_server.py)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from rag_api_server import app  # noqa: E402,F401
