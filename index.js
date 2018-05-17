#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {google} = require('googleapis');
const chalk = require('chalk');
const program = require('commander');
const inquirer = require('inquirer');
const moment = require('moment');

// show tasks
let showAll = false;
let showCalendars = false;
let accessLevel = 'writer';

// Seting up context
const context = __dirname + "/";

// If modifying these scopes, delete CalendarEventCountercredentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = context + 'CalendarEventCountercredentials.json';

/**
 * Program config
 */

program
  .version('1.1.0')
  .description(chalk.cyan('Simple Google Calendar event time counter'));

program
  .command('countCalendars')
  .alias('c')
  .description('Show all calendars details')
  .action(getCalendars);

program
  .command('countAllEvets')
  .alias('a')
  .description('Count all events in all calendars')
  .action(getAllEvents);

program
  .command('viewAllTasks')
  .alias('t')
  .description('Count and view all events in all calendars')
  .action(viewAllTasks);

program
  .command('countSelectedEvets')
  .alias('s')
  .description('Count all events in all calendars between selected dates')
  .action(getSelectedEvents('2018-01-01', '2018-01-31'));

program.parse(process.argv);

function getCalendars() {
  showCalendars = true;
  loadClientSecret(listCalendars);
}

function getAllEvents() {
  loadClientSecret(listCalendars);
}

function viewAllTasks() {
  showAll = true;
  loadClientSecret(listCalendars);
}

function getSelectedEvents(s, e) {
}

/**
 * Load client secrets from a local file.
 */
function loadClientSecret(callback) {
  try {
    const content = fs.readFileSync(context + '/client_secret.json');
    authorize(JSON.parse(content), callback);
  } catch (err) {
    return console.log('Error loading client secret file:', err);
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @return {function} if error in reading credentials.json asks for a new one.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  let token = {};
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    token = fs.readFileSync(TOKEN_PATH);
  } catch (err) {
    return getAccessToken(oAuth2Client, callback);
  }
  oAuth2Client.setCredentials(JSON.parse(token));
  callback(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log(chalk.green.italic('Authorize this app by visiting this url:'), authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question(chalk.green.italic('Enter the code from that page here: '), (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log(chalk.green.italic('Token stored to', TOKEN_PATH));
      } catch (err) {
        console.error(err);
      }
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the events on the user's calendars.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param cid An Google Calendar ID
 * @param csummary An Google Calendar summary
 * @param cbgc An Google Calendar background color
 */
function listEvents(auth, cid, csummary, cbgc) {
	const calendar = google.calendar({version: 'v3', auth});
	const now = new Date();
	const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLastDate = new Date(now.getFullYear(), now.getMonth() -1, 31);
  
  console.log(time);

  calendar.events.list({
    calendarId: cid,
		timeMin: firstDayPrevMonth.toISOString(),
		timeMax: prevMonthLastDate.toISOString(),
		maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, {data}) => {
    if (err) return console.log(chalk.red(csummary + ': The API returned an error: ' + err));
		const events = data.items;
		let total = 0;
    if (events.length) {
      console.log(chalk.hex(cbgc).italic(csummary + ': Upcoming event: ' + events.length+ '\n'));
      events.map((event, i) => {
				// console.log(event);
				const start = event.start.dateTime || event.start.date;
				const eventLength = Math.abs(new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 36e5 || 0;
				total += eventLength;
        if (showAll) {
					console.log(chalk.hex(cbgc)(`${start} - ${event.summary} - length: ${eventLength}h`));
				}
      });
      console.log(chalk.hex(cbgc).bold(`Total: ${parseFloat(total).toFixed(2)}h \n`));
    } else {
      console.log(chalk.red(csummary + ': No upcoming events found.'));
    }
  });
}

function listCalendars(auth) {
	const calendar = google.calendar({version: 'v3', auth});
	calendar.calendarList.list({
		minAccessRole: accessLevel
	}, (err, {data}) => {
		if (err) return console.log('The API returned an error: ' + err);
		const calendars = data.items;
		if (calendars.length) {
			calendars.forEach(element => {
				if (!showCalendars) {
          listEvents(auth, element.id, element.summary, element.backgroundColor);
          return;
        }
        console.log(chalk.hex(element.backgroundColor)(`
          Calendar ID: ${element.id}\n 
          Calendar summary: ${element.summary}\n 
          Calendar bg-color: ${element.backgroundColor}
        `));
			});
		} else {
      console.log('No calendars found.');
		}
	});
}