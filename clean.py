#!/usr/bin/env python3

import os
from pathlib import Path

def rename_files(directory):
    directory = Path(directory)

    for file in directory.iterdir():
        if file.is_file():
            name = file.stem      # filename without extension
            ext = file.suffix     # extension

            # Take first 4 characters (or full name if shorter)
            new_name = name[:4]

            new_file = directory / f"{new_name}{ext}"

            # Avoid overwriting existing files
            counter = 1
            while new_file.exists():
                new_file = directory / f"{new_name}_{counter}{ext}"
                counter += 1

            file.rename(new_file)
            print(f"{file.name} -> {new_file.name}")


if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()
    rename_files(folder_path)