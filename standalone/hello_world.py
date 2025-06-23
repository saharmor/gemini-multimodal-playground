#!/usr/bin/env python3
"""
Simple Hello World script for the Gemini Multimodal Playground.

This script demonstrates basic console output functionality
and serves as a simple example within the project structure.
"""

def main():
    """Main function to print hello world message."""
    print("Hello World!")
    print("Welcome to the Gemini Multimodal Playground!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
    except Exception as e:
        print(f"An error occurred: {e}") 