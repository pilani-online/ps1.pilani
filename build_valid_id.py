import os
import json

def build_valid_ids():
    folder = 'station_data'
    output_file = 'valid_stations.json'
    valid_ids = []

    if not os.path.exists(folder):
        print(f"Error: Folder '{folder}' not found.")
        return

    # Just grab the IDs directly from the filenames (e.g., "4481.json" -> "4481")
    for filename in os.listdir(folder):
        if filename.endswith('.json'):
            valid_ids.append(filename.replace('.json', ''))

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(valid_ids, f)

    print(f"✅ Successfully created '{output_file}' containing {len(valid_ids)} valid station IDs.")

if __name__ == '__main__':
    build_valid_ids()