#!/usr/bin/env python3
"""
Hello World Script for Gemini Multimodal Playground

A simple script to print "Hello World" to the console.
This script demonstrates basic Python functionality and follows
the project's coding standards.
"""

import sys
from datetime import datetime


def print_hello_world():
    """
    Print a greeting message to the console.
    
    Returns:
        str: The greeting message that was printed
    """
    message = "Hello World!"
    print(message)
    return message


def print_enhanced_hello():
    """
    Print an enhanced greeting with timestamp and project context.
    
    Returns:
        str: The enhanced greeting message that was printed
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message = f"Hello World from Gemini Multimodal Playground! [{timestamp}]"
    print(message)
    return message


def main():
    """
    Main function to run the Hello World script.
    
    Provides options for basic or enhanced greeting.
    """
    try:
        print("=" * 50)
        print("Gemini Multimodal Playground - Hello World Script")
        print("=" * 50)
        
        # Print basic hello world
        basic_message = print_hello_world()
        print()
        
        # Print enhanced hello world
        enhanced_message = print_enhanced_hello()
        print()
        
        print("Script executed successfully!")
        return 0
        
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
        return 1
    except Exception as e:
        print(f"An error occurred: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 