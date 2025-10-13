import os
import requests
from datetime import datetime
from dotenv import load_dotenv
import sys
from time import sleep

def main():
    """
    Main function to create a Trello board and populate it with cards.
    """
    load_dotenv()

    # --- 1. Load and validate environment variables ---
    api_key = os.getenv("TRELLO_API_KEY")
    token = os.getenv("TRELLO_TOKEN")
    org_id = os.getenv("TRELLO_ORGANIZATION_ID")
    num_cards_str = os.getenv("NUM_CARDS", "12")
    board_name = os.getenv("BOARD_NAME", f"2025-10-10 - Board with {num_cards_str} cards")

    required_vars = {
        "TRELLO_API_KEY": api_key,
        "TRELLO_TOKEN": token,
        "TRELLO_ORGANIZATION_ID": org_id,
    }

    missing_vars = [key for key, value in required_vars.items() if not value]
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}", file=sys.stderr)
        sys.exit(1)

    try:
        num_cards = int(num_cards_str)
    except ValueError:
        print(f"Error: Invalid value for NUM_CARDS. Must be an integer.", file=sys.stderr)
        sys.exit(1)
        
    auth_params = {"key": api_key, "token": token}
    base_url = "https://api.trello.com/1"

    # --- 2. Create a new Trello Board ---
    print(f"Creating new board named: '{board_name}'...")

    create_board_payload = {
        **auth_params,
        "name": board_name,
        "idOrganization": org_id,
        "defaultLists": "true",
    }

    try:
        response = requests.post(f"{base_url}/boards/", params=create_board_payload)
        response.raise_for_status()
        board = response.json()
        board_id = board["id"]
        print(f"Created board ID: {board_id}")
        board_url = board["url"]
        print(f"Successfully created board: {board_url}")
    except requests.exceptions.RequestException as e:
        print(f"Error creating board: {e}", file=sys.stderr)
        if e.response is not None:
            print(f"Response content: {e.response.text}", file=sys.stderr)
        sys.exit(1)


    # --- 3. Get the first list on the board ---
    print("Fetching lists from the new board...")
    try:
        response = requests.get(f"{base_url}/boards/{board_id}/lists", params=auth_params)
        response.raise_for_status()
        lists = response.json()
        if not lists:
            print("Error: No lists found on the newly created board.", file=sys.stderr)
            sys.exit(1)
        list_id = lists[0]["id"]
        print(f"Found list '{lists[0]['name']}' to add cards to.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching lists: {e}", file=sys.stderr)
        sys.exit(1)

    # --- 4. Create cards in the list ---
    print(f"Creating {num_cards} cards...")
    for i in range(1, num_cards + 1):
        card_payload = {
            **auth_params,
            "idList": list_id,
            "name": f"Card {i}",
            "desc": f"This is the description for card number {i}.",
        }
        print(f"Creating card {i}/{num_cards}")
        try:
            response = requests.post(f"{base_url}/cards", params=card_payload)
            response.raise_for_status()
            print(f"  Created card {i}/{num_cards}")
        except requests.exceptions.RequestException as e:
            print(f"Error creating card {i}: {e}", file=sys.stderr)
            # Decide if you want to stop or continue on failure
            # sys.exit(1) 
        # sleep for 0.2 seconds
        sleep(0.2)
    
    print("\nScript finished successfully!")
    print(f"You can view your new board here: {board_url}")


if __name__ == "__main__":
    main() 