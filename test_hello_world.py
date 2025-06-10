#!/usr/bin/env python3
"""
Test file for hello_world.py
"""

import unittest
import io
import sys
from hello_world import get_message, main

class TestHelloWorld(unittest.TestCase):
    """Test cases for the hello_world module."""
    
    def test_get_message(self):
        """Test that get_message returns the correct string."""
        expected = "hello world from multi-agent team!"
        self.assertEqual(get_message(), expected)
    
    def test_main_output(self):
        """Test that the main function prints the correct message."""
        # Redirect stdout to capture print output
        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        # Call the main function
        main()
        
        # Reset redirect
        sys.stdout = sys.__stdout__
        
        # Get the printed output and strip any whitespace
        output = captured_output.getvalue().strip()
        expected = "hello world from multi-agent team!"
        
        self.assertEqual(output, expected)

if __name__ == "__main__":
    unittest.main()
