# Data Model

:API: data model is as follows:

```
:DataModel:
├─ :ListOfUsers:
│  └─ :User:
│     └─ :Permissions:
└─ :ListOfBoards:
    └─ :Board:
        └─ :ListOfCards:
            └─ :Card:
            ├─ :ListofChecklists:
            │  └─ :Checklist:
            ├─ :ListOfComments:
            │  └─ :Comment:
            └─ :ListOfAttachments:
                └─ :Attachment:
```