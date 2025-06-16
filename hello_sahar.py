#!/usr/bin/env python3
"""
Simple greeting script for the Gemini Multimodal Playground.

This script prints a personalized greeting message to the console.
Follows the project's coding conventions with proper documentation
and error handling.
"""

def print_greeting(name: str = "Sahar") -> None:
    """
    Print a greeting message to the console.
    
    Args:
        name (str): The name to include in the greeting. Defaults to "Sahar".
    """
    try:
        greeting_message = f"Hey {name}"
        print(greeting_message)
    except Exception as e:
        print(f"Error printing greeting: {str(e)}")

def main() -> None:
    """Main function to execute the greeting."""
    print_greeting()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
    except Exception as e:
        print(f"Unexpected error: {str(e)}") 