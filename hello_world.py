#!/usr/bin/env python3
"""
Hello World Script for Gemini Multimodal Playground

A simple script that demonstrates basic Python functionality
following the repository's coding conventions and style.
"""

import sys
from datetime import datetime


def print_hello_world():
    """Print a Hello World message with timestamp to the console."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print("=" * 50)
    print("🌟 Hello World from Gemini Multimodal Playground! 🌟")
    print("=" * 50)
    print(f"Timestamp: {timestamp}")
    print("This script demonstrates clean Python code following")
    print("the repository's style and conventions.")
    print("=" * 50)


def main():
    """Main entry point for the Hello World script."""
    try:
        print_hello_world()
        return 0
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
        sys.exit(130) 