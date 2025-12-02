## Labels

labels from Trello should be mapped to tags in DevRev.

:DefaultLabelsEndpoint: `boards/<TRELLO_BOARD_ID>/labels`

| Trello Field | DevRev Stock Field | Data Type | Trello Endpoint |
|--------------|-------------------|-----------|----------------------------------------------------------|
| `name` (`label-<color>` if no `name == ""`) | `name` | String | :DefaultLabelsEndpoint: |
| `color` (convert to hex color code) | `style` | String | convert using :ColorToHexCodeConversionRule: |
| `name` (`label-<color>` if no `name == ""`) | `description` | rich text | :DefaultLabelsEndpoint: |

### Color to Hex Code Conversion Rule

:ColorToHexCodeConversionRule: Here's how to convert color to hex color code:

| Color | Hex Color Code |
|-------|----------------|
| `green` | `#008000` |
| `blue` | `#0000FF` |
| `orange` | `#FFA500` |
| `purple` | `#800080` |
| `red` | `#FF0000` |
| `yellow` | `#FFFF00` |
| `black` | `#000000` |
| `white` | `#FFFFFF` |
| `gray` | `#808080` |
| `brown` | `#A52A2A` |
| `pink` | `#FFC0CB` |
| `cyan` | `#00FFFF` |
| `magenta` | `#FF00FF` |
| `lime` | `#00FF00` |
| `navy` | `#000080` |
| `maroon` | `#800000` |
| `olive` | `#808000` |
| `teal` | `#008080` |
| `silver` | `#C0C0C0` |
| if no matching color | `#000000` |

Note: Pagination is not needed for labels extraction.