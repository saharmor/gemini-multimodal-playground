#!/usr/bin/env python3
"""
Hello World Script for Gemini Multimodal Playground

A simple demonstration script that prints "Hello World" to the console.
This script follows the repository's coding conventions and can serve as
a basic template for additional functionality.

Author: Generated for Gemini Multimodal Playground
"""

import sys
import os
from datetime import datetime


def print_hello_world():
    """
    Print a Hello World message to the console.
    
    This function demonstrates basic output functionality and follows
    the repository's coding style conventions.
    """
    try:
        print("Hello World!")
        print(f"Welcome to Gemini Multimodal Playground!")
        print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Python version: {sys.version.split()[0]}")
        print(f"Working directory: {os.getcwd()}")
        
    except Exception as e:
        print(f"Error printing hello world message: {e}")
        return False
    
    return True


def main():
    """
    Main entry point for the Hello World script.
    
    Demonstrates proper main function structure following the
    repository's conventions.
    """
    print("=" * 50)
    print("GEMINI MULTIMODAL PLAYGROUND - HELLO WORLD")
    print("=" * 50)
    
    success = print_hello_world()
    
    if success:
        print("\n✅ Hello World script executed successfully!")
    else:
        print("\n❌ Hello World script encountered an error!")
        sys.exit(1)
    
    print("=" * 50)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1) 