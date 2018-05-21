# About
This simple app was build for practice with Google Calendar API and to help counting total time spent on projects in previus month.
For now it will cycle through all calendars that you have at least ```writer``` permission.

Assumptions: \
- Days off are marked as full day events
- Events that overlaps with other events should have it color changed - and won't be counted. Partial overlap is curently not supported.

---

## Seting up Google Calendar API
1. Use this wizard to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.
2. On the Add credentials to your project page, click the Cancel button.
3. At the top of the page, select the OAuth consent screen tab. Select an Email address, enter a Product name if not already set, and click the Save button.
4. Select the Credentials tab, click the Create credentials button and select OAuth client ID.
5. Select the application type Other, enter the name "Google Calendar API Quickstart", and click the Create button.
6. Click OK to dismiss the resulting dialog.
7. Click the file_download (Download JSON) button to the right of the client ID.
8. Move this file to your working directory and rename it client_secret.json.

Token is generated for 24h.

## Usage
After authorization and instaling dependecies (```npm install```) simply run ```node index.js```

If you want to se full list of tasks change ```showAll``` to ```true```

To use it globaly run ```npm link``` while in project directory.

## Additional config

You can create custom configuration for calendars (use only selected insted of all) with additional params.
For list of all calendars you can either print they id, summary and background color to console or save all they data in to ```calendars.json``` file and then copy it into ```config.json``` created based on ```config-template.json```.


---

### To Do

- ~~Making script more interactive.~~
- ~~Sort events by name and count total time/event for them~~.
- ~~Add option to select specyfic date range.~~
- ~~Add configuration for manual selection of calendars to cycle through~~. 
- Better detection of overlaping events.
- Better projecs grouping 