## Boards

boards from Trello should be mapped to external sync units in DevRev.

:DefaultBoardsEndpoint: `organizations/<TRELLO_ORGANIZATION_ID>/boards`

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `id` | `id` | String | :DefaultBoardsEndpoint: |
| `name` | `name` | String | :DefaultBoardsEndpoint: |
| `desc` | `description` | String (Markdown) | :DefaultBoardsEndpoint: |
| fixed value of "cards" | `item_type` | String | no endpoint needed |

