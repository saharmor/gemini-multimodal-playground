"""
Hello World Strawberry Counter

This script counts the occurrences of the letter 'r' in the word 'strawberry'
and prints both the word and the count.
"""


def count_letter_occurrences(word: str, letter: str) -> int:
    """
    Count the occurrences of a specific letter in a word.
    
    Args:
        word: The word to search in
        letter: The letter to count occurrences of
        
    Returns:
        The number of occurrences of the letter in the word
    """
    return word.lower().count(letter.lower())


def main():
    """Main function to execute the letter counting logic."""
    word = "strawberry"
    letter = "r"
    
    count = count_letter_occurrences(word, letter)
    
    print(f"Word: {word}")
    print(f"Count of letter '{letter}': {count}")


if __name__ == "__main__":
    main()
