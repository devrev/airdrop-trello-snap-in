import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent
from browser_use.llm import ChatAnthropic, ChatGoogle
from browser_use.browser import BrowserProfile, Browser
from browser_use.browser import BrowserSession


import uuid

NUMBER_OF_USERS_TO_INVITE = 5
RANDOM_UUIDS = [str(uuid.uuid4()) for _ in range(NUMBER_OF_USERS_TO_INVITE)]

TRELLO_EXISTING_USER_EMAIL = os.getenv("TRELLO_EXISTING_USER_EMAIL")
if not TRELLO_EXISTING_USER_EMAIL:
    raise ValueError("TRELLO_EXISTING_USER_EMAIL is not set")
TRELLO_EXISTING_USER_PASSWORD = os.getenv("TRELLO_EXISTING_USER_PASSWORD")
if not TRELLO_EXISTING_USER_PASSWORD:
    raise ValueError("TRELLO_EXISTING_USER_PASSWORD is not set")
TRELLO_NEW_EMAIL = "example+<uuid>@codeplain.ai"
TRELLO_WORKSPACE_NAME = os.getenv("TRELLO_WORKSPACE_NAME")
if not TRELLO_WORKSPACE_NAME:
    raise ValueError("TRELLO_WORKSPACE_NAME is not set")

TRELLO_BOARD_NAME = "cards-pagination-test-2025-07-28-092514"

TRELLO_MEMBERS_WORKSPACE_URL = "https://trello.com/w/userworkspace04384507/members"

trello_task = f"""
Firstly, do "Login and setup" once, and then proceed to "The Invite of The Workspace Members".

## Login and setup

Go to https://trello.com. If needed, login with the following credentials: email: x_trello_email, password: x_trello_password.

## The Invite of The Workspace Members

Then, go to {TRELLO_MEMBERS_WORKSPACE_URL}. Here, you should invite Workspace members (The Invite of The Workspace Members).

Here's how to execute The Invite of The Workspace Members for the i-th iteration:

- Locate button "Invite Workspace Members" In is on top right corner of the page, colored in blue.
- Click on button "Invite Workspace Members".
- Enter the email address of the user you want to invite in the field "Email address or name". The email address should be {TRELLO_NEW_EMAIL}, where <uuid> is on the i-th position in the list {RANDOM_UUIDS}, where "i" is the current iteration.
- Wait one second for the dropdown to populate.
- In the populated dropdown, click on the email that appears in the dropdown.
- Press "Send invite" button.
- Sleep for 3 seconds.

For i in range({NUMBER_OF_USERS_TO_INVITE}), execute The Invite of The Workspace Members.
"""

# - Go to gmail.com and login with the following credentials: email: x_google_email, password: x_google_password.
# - Go to the inbox and find the latest email with the subject "SaaS Connectors invited you to a Trello Workspace".
# - Click on the link that email and scroll to the bottommost email.
# - Click on "Go to Workspace" button. You'll be redirected back to trello.com.
# - This will open a new tab. Close the Gmail one and go to the new tab.

async def main():

    profile = BrowserProfile(
        allowed_domains=["trello.com", "gmail.com", "id.atlassian.com"],
    )
    session = BrowserSession(profile=profile)

    for _ in range(10):
        agent = Agent(
            task=trello_task,
            browser_session=session,
            sensitive_data={
                "https://*": {
                    "x_trello_email": TRELLO_EXISTING_USER_EMAIL,
                    "x_trello_password": TRELLO_EXISTING_USER_PASSWORD,
                }
            },
            llm=ChatAnthropic(model="claude-4-sonnet-20250514", temperature=1.0),
            # llm=ChatAnthropic(model="claude-3-5-haiku-latest", temperature=0.6),
            # llm=ChatGoogle(model="gemini-2.5-flash", temperature=1.0),
        )
        await agent.run()

asyncio.run(main())