/**
 * Generates the External Domain Metadata schema for Trello integration
 * 
 * @returns The complete metadata schema object
 */
export function generateMetadataSchema() {
  return {
    schema_version: "v0.2.0",
    record_types: {
      // Cards record type
      cards: {
        name: "Trello Cards",
        description: "Cards from Trello boards",
        fields: {
          id: {
            type: "text",
            name: "ID",
            description: "The unique identifier for the card",
            is_required: true,
            is_identifier: true,
            is_indexed: true
          },
          name: {
            type: "text",
            name: "Name",
            description: "The name of the card",
            is_required: true,
            is_indexed: true
          },
          description: {
            type: "rich_text",
            name: "Description",
            description: "The description of the card",
            is_required: false
          },
          is_closed: {
            type: "bool",
            name: "Is Closed",
            description: "Whether the card is closed (archived)",
            is_required: true,
            is_indexed: true,
            default_value: false
          },
          list_id: {
            type: "text",
            name: "List ID",
            description: "The ID of the list that the card belongs to",
            is_required: true,
            is_indexed: true
          },
          board_id: {
            type: "reference",
            name: "Board",
            description: "The board that the card belongs to",
            is_required: true,
            is_indexed: true,
            reference: {
              refers_to: {
                "#record:boards": {}
              }
            }
          },
          url: {
            type: "text",
            name: "URL",
            description: "The URL of the card",
            is_required: false
          },
          short_url: {
            type: "text",
            name: "Short URL",
            description: "The short URL of the card",
            is_required: false
          },
          due_date: {
            type: "timestamp",
            name: "Due Date",
            description: "The due date of the card",
            is_required: false,
            is_indexed: true
          },
          is_due_complete: {
            type: "bool",
            name: "Is Due Complete",
            description: "Whether the card's due date has been marked as complete",
            is_required: false,
            default_value: false
          },
          labels: {
            type: "struct",
            name: "Labels",
            description: "The labels attached to the card",
            is_required: false,
            collection: {
              min_length: 0
            },
            struct: {
              key: "card_label"
            }
          },
          member_ids: {
            type: "reference",
            name: "Members",
            description: "The members assigned to the card",
            is_required: false,
            collection: {
              min_length: 0
            },
            reference: {
              refers_to: {
                "#record:users": {}
              }
            }
          },
          created_date: {
            type: "timestamp",
            name: "Created Date",
            description: "The date when the card was created",
            is_required: true,
            is_indexed: true
          },
          modified_date: {
            type: "timestamp",
            name: "Modified Date",
            description: "The date when the card was last modified",
            is_required: true,
            is_indexed: true
          }
        }
      },
      // Users record type
      users: {
        name: "Trello Users",
        description: "Users from Trello organization",
        fields: {
          id: {
            type: "text",
            name: "ID",
            description: "The unique identifier for the user",
            is_required: true,
            is_identifier: true,
            is_indexed: true
          },
          username: {
            type: "text",
            name: "Username",
            description: "The username of the user",
            is_required: true,
            is_indexed: true
          },
          full_name: {
            type: "text",
            name: "Full Name",
            description: "The full name of the user",
            is_required: false,
            is_indexed: true
          },
          initials: {
            type: "text",
            name: "Initials",
            description: "The initials of the user",
            is_required: false
          },
          email: {
            type: "text",
            name: "Email",
            description: "The email address of the user",
            is_required: false,
            is_indexed: true
          },
          avatar_url: {
            type: "text",
            name: "Avatar URL",
            description: "The URL of the user's avatar",
            is_required: false
          },
          bio: {
            type: "text",
            name: "Bio",
            description: "The bio of the user",
            is_required: false
          },
          url: {
            type: "text",
            name: "URL",
            description: "The URL of the user's profile",
            is_required: false
          },
          created_date: {
            type: "timestamp",
            name: "Created Date",
            description: "The date when the user was created",
            is_required: true,
            is_indexed: true
          },
          modified_date: {
            type: "timestamp",
            name: "Modified Date",
            description: "The date when the user was last modified",
            is_required: true,
            is_indexed: true
          }
        }
      },
      // Boards record type (needed for references)
      boards: {
        name: "Trello Boards",
        description: "Boards from Trello",
        fields: {
          id: {
            type: "text",
            name: "ID",
            description: "The unique identifier for the board",
            is_required: true,
            is_identifier: true,
            is_indexed: true
          },
          name: {
            type: "text",
            name: "Name",
            description: "The name of the board",
            is_required: true,
            is_indexed: true
          },
          description: {
            type: "text",
            name: "Description",
            description: "The description of the board",
            is_required: false
          },
          url: {
            type: "text",
            name: "URL",
            description: "The URL of the board",
            is_required: false
          },
          short_url: {
            type: "text",
            name: "Short URL",
            description: "The short URL of the board",
            is_required: false
          },
          is_closed: {
            type: "bool",
            name: "Is Closed",
            description: "Whether the board is closed (archived)",
            is_required: true,
            is_indexed: true,
            default_value: false
          },
          organization_id: {
            type: "text",
            name: "Organization ID",
            description: "The ID of the organization that the board belongs to",
            is_required: false,
            is_indexed: true
          },
          created_date: {
            type: "timestamp",
            name: "Created Date",
            description: "The date when the board was created",
            is_required: true,
            is_indexed: true
          },
          modified_date: {
            type: "timestamp",
            name: "Modified Date",
            description: "The date when the board was last modified",
            is_required: true,
            is_indexed: true
          }
        }
      }
    },
    struct_types: {
      card_label: {
        name: "Card Label",
        fields: {
          id: {
            type: "text",
            name: "ID",
            description: "The unique identifier for the label",
            is_required: true
          },
          name: {
            type: "text",
            name: "Name",
            description: "The name of the label",
            is_required: false
          },
          color: {
            type: "text",
            name: "Color",
            description: "The color of the label",
            is_required: false
          }
        }
      }
    }
  };
}