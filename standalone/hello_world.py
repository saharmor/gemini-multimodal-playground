#!/usr/bin/env python3
"""
Simple script to print "hello world" to the console.
"""

def main():
    """
    Main function that prints 'hello world' to the console.
    """
    try:
        print("hello world")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()
