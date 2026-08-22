"""Pytest configuration: make the backend root importable."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))