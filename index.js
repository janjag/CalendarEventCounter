#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {google} = require('googleapis');
const chalk = require('chalk');
const program = require('commander');
const inquirer = require('inquirer');
const moment = require('moment');

// Seting up context
const context = __dirname + "/";

// show tasks
let useConfig = false;
let showAll = false;
let showAllCompact = false;
let showCalendars = false;
let accessLevel = 'writer';
let selectedDates = {};
let saveCalendars = false;
const CALENDARS = context + 'calendars.json';

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

program.parse(process.argv);

function getCalendars() {
  loadClientSecret(listCalendars);
}

function getAllEvents() {
  loadClientSecret(listCalendars);
}

function viewAllTasks() {
  showAll = true;
  loadClientSecret(listCalendars);
}

function options() {
  inquirer.prompt([
    {
      type: 'checkbox',
      message: 'Group tasks?',
      name: 'groupTasks',
      choices: [
        {
          name: 'Yes'
        }
      ]
    },{
      type: 'checkbox',
      message: 'Use config file?',
      name: 'useConfig',
      choices: [
        {
          name: 'Yes'
        }
      ]
    }
  ]).then(answers => {
    showAll = true;
    if(answers.groupTasks[0] === 'Yes') {
      showAllCompact = true;
    }

    if(answers.useConfig[0] === 'Yes') {
      useConfig = true;
    }
    
    getAllEvents();
  });
}


const questions = [
  {
    type: 'input',
    name: 'start_date',
    message: "Query start date",
    validate: function(value) {
      var pass = value.match(
        /^\d{4}\-\d{1,2}\-\d{1,2}$/
      );
      if (pass) {
        return true;
      }

      return 'Required date format: YYYY-MM-DD';
    }
  },
  {
    type: 'input',
    name: 'end_date',
    message: "Query end date",
    validate: function(value) {
      var pass = value.match(
        /^\d{4}\-\d{1,2}\-\d{1,2}$/
      );
      if (pass) {
        return true;
      }

      return 'Required date format: YYYY-MM-DD';
    }
  }
];

inquirer.prompt([
  {
    type: 'list',
    name: 'task',
    message: 'What do you want to do?',
    choices: [
      'Show all calendars details',
      'Count all events in all calendars',
      'Count and view all events in all calendars',
      'Count all events in all calendars between selected dates'
    ]
  }
]).then(answers => {
  if(answers.task === 'Show all calendars details') {
    inquirer.prompt([
      {
        type: 'checkbox',
        message: 'Do you want to save query results?',
        name: 'saveCalendars',
        choices: [
          {
            name: 'Yes'
          }
        ]
      }
    ]).then(answers => {
      if(answers.saveCalendars[0] === 'Yes') {
        saveCalendars = true;
      }
      getCalendars();
    });
  }
  if(answers.task === 'Count all events in all calendars') {
    inquirer.prompt([
      {
        type: 'checkbox',
        message: 'Use config file?',
        name: 'useConfig',
        choices: [
          {
            name: 'Yes'
          }
        ]
      }
    ]).then(answers => {
      if(answers.useConfig[0] === 'Yes') {
        useConfig = true;
      }
      
      getAllEvents();
    });
  }
  if(answers.task === 'Count and view all events in all calendars') {
    options();
  }
  if(answers.task === 'Count all events in all calendars between selected dates') {
    console.log(chalk.yellow.bold('Required date format: YYYY-MM-DD'));
    inquirer.prompt(questions).then(answers => {
      selectedDates = {
        start_date: moment(answers.start_date).format(),
        end_date: moment(answers.end_date).format()
      }

      options();
    });
  }
});

/**
 * Load client secrets from a local file.
 */
function loadClientConfig(callback) {
  try {
    const content = fs.readFileSync(context + '/client_secret.json');
    authorize(JSON.parse(content), callback);
  } catch (err) {
    return console.log('Error loading client secret file:', err);
  }
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
 * @param hRate Hourly rate form config file
 * @param tax Tax from config file
 */
function listEvents(auth, cid, csummary, cbgc, hRate, tax) {
	const calendar = google.calendar({version: 'v3', auth});
	const now = new Date();
	const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLastDate = new Date(now.getFullYear(), now.getMonth() -1, 31);

  calendar.events.list({
    calendarId: cid,
		timeMin: selectedDates.start_date || firstDayPrevMonth.toISOString(),
		timeMax: selectedDates.end_date || prevMonthLastDate.toISOString(),
		maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, {data}) => {
    if (err) return console.log(chalk.red(csummary + ': The API returned an error: ' + err));
		const events = data.items;
    let total = 0;
    let tasks = [];
    let sortedTasks = [];
    if (events.length) {
      console.log(chalk.hex(cbgc).italic(csummary + ' - events: ' + events.length));
      events.map((event, i) => {
        // if event has specified color - it means that it overlaps with other event(s) and should be skipped
        if(event.colorId) {
          return;
        }
				const start = event.start.dateTime || event.start.date;
				const eventLength = Math.abs(new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000 || 0;
        total += eventLength;
        
        let item = {
          name: event.summary,
          length: eventLength
        }
        tasks.push(item);
        if (showAll && !showAllCompact) {
          console.log(chalk.hex(cbgc)(`${start} - ${event.summary} - length: ${eventLength}min`));
				}
      });
      if (showAllCompact) {
        let groupedTasks = [];
        let j = 0;
        sortedTasks = tasks.sort(compareValues('name'));
        sortedTasks.forEach((task, i) => {
          let item = {
            name: task.name,
            length: task.length
          }
          if (i === 0) {
            // console.log(`first element`);
            groupedTasks.push(item);
          } else {
            if(task.name.toUpperCase() !== sortedTasks[i - 1].name.toUpperCase() ) {
              // console.log(`new element => ${task.name.toUpperCase()} !== ${sortedTasks[i - 1].name.toUpperCase()} i=${i}, j=${j}`);
              groupedTasks.push(item);
              j += 1;
            } else {
              // console.log(`add element => ${task.name.toUpperCase()} === ${sortedTasks[i - 1].name.toUpperCase()} i=${i}, j=${j}`);
              // console.log(`${groupedTasks[j].length} += ${task.length}`);
              groupedTasks[j].length += task.length;
            }
          }
        });
        groupedTasks.forEach((group, i) => {
          console.log(chalk.hex(cbgc)(`${group.name}: ${group.length}min  / ${group.length / 60}h`));
        });
      } 
      if (hRate && tax) {
        let cost = (total / 60) * hRate
        console.log(chalk.hex(cbgc).bold(`Total: ${parseFloat(total).toFixed(2)}min  / ${total / 60}h `));
        console.log(chalk.hex(cbgc)(`${cost} PLN brutto / Tax: ${cost * tax} PLN / ${cost - (cost * tax)} PLN netto \n`));
      } else {
        console.log(chalk.hex(cbgc).bold(`Total: ${parseFloat(total).toFixed(2)}min  / ${total / 60}h \n`));
      }
    } else {
      console.log(chalk.red(csummary + ': No upcoming events found.'));
    }
  });
}

function listCalendars(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  console.log(useConfig);
  if(useConfig) {
    console.log('Using config file...');

    try {
      const calendarsConfig = fs.readFileSync(context + '/config.json');
      const calendars = JSON.parse(calendarsConfig);

      calendars.forEach(element => {
        listEvents(auth, element.id, element.summary, element.backgroundColor, element.hourlyRate, element.tax);
      });
    } catch (err) {
      return console.log('Error loading config file:', err);
    }

    return;
  }

	calendar.calendarList.list({
		minAccessRole: accessLevel
	}, (err, {data}) => {
		if (err) return console.log('The API returned an error: ' + err);
		const calendars = data.items;
		if (calendars.length) {
      if(saveCalendars) {
        fs.writeFileSync(CALENDARS, JSON.stringify(calendars));
        console.log(chalk.green.italic('File stored to', CALENDARS));
      }
			calendars.forEach(element => {
				if (!saveCalendars) {
          listEvents(auth, element.id, element.summary, element.backgroundColor);
        } else {console.log(chalk.hex(element.backgroundColor)(`
            Calendar ID: ${element.id}
            Calendar summary: ${element.summary}
            Calendar bg-color: ${element.backgroundColor}
          `));
        }
        
			});
		} else {
      console.log('No calendars found.');
		}
	});
}

// helper function
function compareValues(key, order='asc') {
  return function(a, b) {
    if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
        return 0; 
    }

    const varA = (typeof a[key] === 'string') ? 
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ? 
      b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order == 'desc') ? (comparison * -1) : comparison
    );
  };
}