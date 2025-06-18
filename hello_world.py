#!/usr/bin/env python3
"""
Hello World Script for Gemini Multimodal Playground

A simple script that demonstrates basic Python functionality while following
the project's coding conventions and style guidelines.
"""

import sys
from datetime import datetime


class HelloWorldPrinter:
    """A class to handle different types of hello world messages."""
    
    def __init__(self, name: str = "World"):
        """
        Initialize the HelloWorldPrinter.
        
        Args:
            name (str): The name to greet. Defaults to "World".
        """
        self.name = name
        self.timestamp = datetime.now()
    
    def print_simple_hello(self) -> None:
        """Print a simple hello message to the console."""
        print(f"Hello, {self.name}!")
    
    def print_detailed_hello(self) -> None:
        """Print a detailed hello message with timestamp."""
        formatted_time = self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        print(f"Hello, {self.name}!")
        print(f"Greetings from the Gemini Multimodal Playground ✨")
        print(f"Current time: {formatted_time}")
    
    def print_ascii_art_hello(self) -> None:
        """Print hello with ASCII art."""
        ascii_art = """
    ╔═══════════════════════════════════════╗
    ║          HELLO WORLD! 🌍              ║
    ║    Gemini Multimodal Playground ✨    ║
    ╚═══════════════════════════════════════╝
        """
        print(ascii_art)
        print(f"Welcome, {self.name}!")


def main() -> None:
    """
    Main function to run the hello world script.
    
    Handles command line arguments and demonstrates different greeting styles.
    """
    try:
        # Check for command line arguments
        name = "World"
        style = "simple"
        
        if len(sys.argv) > 1:
            name = sys.argv[1]
        
        if len(sys.argv) > 2:
            style = sys.argv[2].lower()
        
        # Create hello world printer instance
        printer = HelloWorldPrinter(name)
        
        # Print greeting based on style
        if style == "detailed":
            printer.print_detailed_hello()
        elif style == "ascii":
            printer.print_ascii_art_hello()
        else:
            printer.print_simple_hello()
        
        print("\n🎉 Hello World script executed successfully!")
        
    except KeyboardInterrupt:
        print("\nExiting on user interrupt...")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 