import os
import json

def build_index():
    folder = 'station_data'
    output_file = 'stations_index.json'
    index_data = []

    if not os.path.exists(folder):
        print(f"Error: Folder '{folder}' not found.")
        return

    for filename in os.listdir(folder):
        if filename.endswith('.json'):
            filepath = os.path.join(folder, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                basic = data.get('station_basic', {})
                pbs = data.get('problem_banks', [])

                station_id = basic.get('stationId')
                if not station_id:
                    continue

                # Find the latest problem bank based on batchId
                latest_pb = None
                if pbs:
                    latest_pb = sorted(pbs, key=lambda x: x.get('problem_bank', {}).get('batchId', 0), reverse=True)[0]

                total_req = 0
                tags = []
                if latest_pb:
                    total_req = latest_pb.get('problem_bank', {}).get('totalRequirement', 0)
                    projects = latest_pb.get('projects', [])
                    
                    for proj in projects:
                        for key in ['disciplines', 'tags', 'eligibility']:
                            if key in proj and isinstance(proj[key], list):
                                for t in proj[key]:
                                    if isinstance(t, str): tags.append(t)
                            elif key in proj and isinstance(proj[key], str):
                                tags.append(proj[key])

                # Make tags unique
                tags = list(set(tags))

                index_data.append({
                    "id": station_id,
                    "name": basic.get('stationName', 'Unknown'),
                    "city": basic.get('city', 'N/A'),
                    "domain": basic.get('stationDomain', 'General'),
                    "total_req": total_req,
                    "tags": tags
                })

            except Exception as e:
                print(f"Error processing {filename}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=4)

    print(f"✅ Successfully created '{output_file}' with {len(index_data)} stations. (Only stations with JSONs are included).")

if __name__ == '__main__':
    build_index()