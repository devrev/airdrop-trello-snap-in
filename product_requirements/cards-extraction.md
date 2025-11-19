## Cards

:DefaultCardsEndpoint: `boards/<TRELLO_BOARD_ID>/cards?attachments=true`

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `id` | `id` | String | :DefaultCardsEndpoint: |
| `name` | `title` | String | :DefaultCardsEndpoint: |
| `desc` | `body` | String (Markdown) | :DefaultCardsEndpoint: |
| `due` | `target_close_date` | DateTime | :DefaultCardsEndpoint: |
| `idList` | `stage` | Reference | use `idList` field from :DefaultCardsEndpoint: and apply :StageMappingRule: |
| `url` | `item_url_field` | URL | :DefaultCardsEndpoint: |
| `idMembers` | `owned_by_ids` | Array of References | :DefaultCardsEndpoint: |
| `idLabels` | `tags` | Array of References | :DefaultCardsEndpoint: |
| `idMemberCreator` | `created_by_id` | Reference | `cards/<CARD_ID>/actions?filter=createCard`, where `CARD_ID` is `id` obtained from :DefaultCardsEndpoint: |
| `dueComplete` | `trello_due_complete` (custom field) | Bool | :DefaultCardsEndpoint: |
| `pos` | `trello_position` (custom field) | Number | :DefaultCardsEndpoint: |
| `closed` | `state` (custom field) | Bool | :DefaultCardsEndpoint: |
| `dateLastActivity` | `modified_date` (custom field) | DateTime | `cards/<CARD_ID>/actions?filter=updateCard&limit=1`, where `CARD_ID` is `id` obtained from :DefaultCardsEndpoint: |
| `subscribed` | `trello_subscribed` (custom field) | Bool | :DefaultCardsEndpoint: |
| `cover` | `trello_cover_image` (custom field) | JSON | :DefaultCardsEndpoint: |
| `badges` | `trello_badges` (custom field) | JSON | :DefaultCardsEndpoint: |
| `start` | `trello_start_date` (custom field) | DateTime | :DefaultCardsEndpoint: |

### Stage Mapping Rule

:StageMappingRule: During card extraction, here's how to map lists to stage:

Make request to `boards/<TRELLO_BOARD_ID>/lists`. Construct mapping from "id" to "name" (and lowercase the names) (:ListIdToNameMapping:) for the lists.

Take field `idList` from :DefaultCardsEndpoint: and retrieve the name (:ListName:) from :ListIdToNameMapping:. Refer to the following logic to map the list name to the stage:

| :ListName: contains string | DevRev stage |
|----------------------------------------|--------------|
| "backlog" | "backlog" |
| "Doing" | "in_development" |
| "Review" | "in_review" |
| "Done" | "completed" |
| "archive" | "completed" |
| if no match | "backlog" |

### Retrieve Created By

Here's how to retrieve the created by information:

- After making request to `cards/<CARD_ID>/actions?filter=createCard` (and take the first element of the response), get the value of "idMemberCreator" from the response.

### Retrieve Modified By

Here's how to retrieve the modified by information:

- After making request to `cards/<CARD_ID>/actions?filter=updateCard&limit=1` (and take the first element of the response), get the value of "idMemberCreator" from the response.

### How to extract cards data

Before extracting cards, call endpoint `boards/<TRELLO_BOARD_ID>/lists` to get the list of lists for the board. Construct mapping from "id" to "name" (and lowercase the names) for the lists.

Here's how you should extract the cards data:
1. Construct :ListIdToNameMapping: by calling endpoint `boards/<TRELLO_BOARD_ID>/lists`.
2. Fetch all cards from :DefaultCardsEndpoint:
3. For each card in :DefaultCardsEndpoint: response:
   - Extract created by field by calling endpoint `cards/<CARD_ID>/actions?filter=createCard`.

Note: Pagination must be supported for cards extraction by providing the "before" and "limit" query parameters when listing cards on endpoint :DefaultCardsEndpoint: and updating TheExtractionStateObject["cards"]["before"] and TheExtractionStateObject["cards"]["completed"] accordingly.