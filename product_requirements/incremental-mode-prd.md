## Incremental mode

Incremental mode should work for the following :ArtifactName:s:
- "cards"
- "attachments"
- "comments"

Here's how it should work:

- Fetch cards using pagination. For every page of cards:
  - Filter only by cards that have been updated after the time of the last successful sync.
  - Push the filtered cards to :DevRevServers:.
  - Only push the attachments that belong to cards that have been updated after the time of the last successful sync.
  - Only fetch and push the comments that belong to cards that have been updated after the time of the last successful sync.

### Trello API specifics

Here are specifics you need to understand about :API: when implementing incremental mode:

- Based on the field "dateLastActivity" (ISO 8601 Extended Format with timezone), you should client-side filter only the cards that have been updated after the time of the last successful sync.
- :API: *does not* support filtering by "dateLastActivity" server-side.