## Comments on Cards

Trello comments should be mapped to DevRev comments.

:DefaultCommentsEndpoint: `cards/<TRELLO_CARD_ID>/actions?filter=commentCard`

Let :comment: be one element in the array of comments returned by :DefaultCommentsEndpoint:.

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `id` | `id` | String | :DefaultCommentsEndpoint: |
| `comment["data"]["text"]` | `body` | rich_text | :DefaultCommentsEndpoint: |
| `comment["data"]["idCard"]` | `parent_object_id` | Reference | :DefaultCommentsEndpoint: |
| `comment["idMemberCreator"]` | `created_by_id` | Reference | :DefaultCommentsEndpoint: |
| `comment["data"]["dateLastEdited"]` | `modified_date` | DateTime | :DefaultCommentsEndpoint: |
| `comment["data"]["board"]["id"]` | `grandparent_object_id` | Reference | :DefaultCommentsEndpoint: |
| Fixed value of "board" | `grandparent_object_type` | String | no endpoint needed |
| `comment["memberCreator"]["username"]` | `creator_display_name` | String | :DefaultCommentsEndpoint: |
| Fixed value of "issue" | `parent_object_type` | String | no endpoint needed |

Note: Pagination is not needed for comments extraction.