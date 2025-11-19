## Attachments on Cards

You retrieve attachments inside :DefaultCardsEndpoint: by providing query parameter `attachments` set to `true`.

For each :RetrievedAttachment: in `response["attachments"]` when calling :DefaultCardsEndpoint: :

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `id` | `id` | String | :RetrievedAttachment: |
| `idMember` | `author_id` | Reference | :RetrievedAttachment: |
| `url` | constructed URL | URL | use :URLConstructionRule: |
| `name` | `file_name` | String | :RetrievedAttachment: |
| Card ID | `parent_id` | Reference | :RetrievedAttachment: |

### URL Construction Rule

For constructing the URL, consider :URLConstructionRule: :

- if field "url" from :RetrievedAttachment: starts with "https://trello.com": construct the "url" field using the following format: `https://api.trello.com/1/cards/{idCard}/attachments/{idAttachment}/download/{fileName}`, where `idCard` is `id` of the card, `idAttachment` is `id` of the attachment.
- else: set the "url" field to the original "url" field of :RetrievedAttachment:

### Important during attachment streaming

When streaming the attachments, you should authenticate using OAuth 1.0a authentication (regular Trello query param authentication **WILL NOT** work).