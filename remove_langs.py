
import os

file_path = r'c:\Users\Administrator\.gemini\antigravity\scratch\HappyGames\client\src\lib\i18n.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Ranges to remove (1-based index from view_file, so 0-based index is i-1)
# ru (191) to fr end (480) -> 190 to 480
# pt (753) to pt end (847) -> 752 to 847
# ms (943) to he end (1132) -> 942 to 1132

# We must remove from bottom to top to avoid shifting indices
ranges = [
    (942, 1132), # ms, he
    (752, 847),  # pt
    (190, 480)   # ru, de, fr
]

# Check if lines match expected content to be safe
# Line 191 (index 190) should contain "ru: {"
# Line 753 (index 752) should contain "pt: {"
# Line 943 (index 942) should contain "ms: {"

if "ru: {" not in lines[190]:
    print(f"Error: Line 191 does not contain 'ru: {{'. Found: {lines[190]}")
    exit(1)
if "pt: {" not in lines[752]:
    print(f"Error: Line 753 does not contain 'pt: {{'. Found: {lines[752]}")
    exit(1)
if "ms: {" not in lines[942]:
    print(f"Error: Line 943 does not contain 'ms: {{'. Found: {lines[942]}")
    exit(1)

new_lines = []
current_line = 0
ranges_idx = len(ranges) - 1 # Start from the last range (which is the first in the list because I sorted them? No, I listed them bottom-up)
# Wait, I listed them bottom-up: ms/he (highest), pt (middle), ru/de/fr (lowest).
# So I should process them.

# Actually, easier way: create a set of indices to exclude
exclude_indices = set()
for start, end in ranges:
    for i in range(start, end):
        exclude_indices.add(i)

final_lines = []
for i, line in enumerate(lines):
    if i not in exclude_indices:
        final_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Successfully removed lines.")
