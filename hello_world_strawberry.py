"""
A simple script that counts the occurrences of the letter 'r' in the word 'strawberry'.
"""


def count_letter_occurrences(word: str, letter: str) -> int:
    """
    Count the number of occurrences of a specific letter in a word.
    
    Args:
        word: The word to search in
        letter: The letter to count
        
    Returns:
        The number of occurrences of the letter in the word
    """
    return word.lower().count(letter.lower())


if __name__ == "__main__":
    word = "strawberry"
    letter = "r"
    count = count_letter_occurrences(word, letter)
    
    print(f"Word: {word}")
    print(f"Number of '{letter}' occurrences: {count}")
