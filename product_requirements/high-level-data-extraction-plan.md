## Data Extraction Plan

Here's the order of artifact extraction:

- Extract users data (no pagination)
  - For each user, fetch additional information.
- Extract labels data (no pagination)
- Extract cards data (with pagination)
  - For every page of cards:
    - For every card in the page:
      - Call required endpoints to get additional required information for the card.
      - Fetch comments and extract comments data (no pagination)
      - Retrieve attachments and extract attachments data (no pagination)
