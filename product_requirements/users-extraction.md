## Users

users from Trello should be mapped to devu users in DevRev.

:DefaultUsersEndpoint: `organizations/<TRELLO_ORGANIZATION_ID>/members?fields=fullName,avatarHash,username`

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `id` | `id` | String | :DefaultUsersEndpoint: |
| `fullName` | `full_name` | String | :DefaultUsersEndpoint: |
| `username` | `username` | String | :DefaultUsersEndpoint: |
| `email` | `email` | String | `GET members/<MEMBER_ID>`, where `MEMBER_ID` is `id` obtained from :DefaultUsersEndpoint: |

Here's how you should extract users data:
1. Fetch all users from :DefaultUsersEndpoint:
2. For each user in :DefaultUsersEndpoint: response, make request to `members/<MEMBER_ID>` and extract the rest of fields.

Note: Pagination is not needed for users extraction.