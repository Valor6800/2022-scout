const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
var TBA = require('./src/tba.js');
var tba = new TBA();

require('dotenv').config();

let keys = fs.readFileSync('keys.json');
let credentials = JSON.parse(keys);

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_SCOUT_TOKEN
});

const web = new WebClient(process.env.SLACK_BOT_TOKEN);
const doc = new GoogleSpreadsheet(credentials.spreadsheet);
const channelId = process.env.SLACK_CHANNEL_ID;

async function load()
{
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();

    app.listen(process.env.APP_PORT || 8080);
    await slack.start(process.env.SLACK_PORT || 8081);
    console.log('Server is listening on port 8080');
    console.log('Slack is listening on port 8081');

    slack.message('Match report', async ({ message, say }) => {
        let match_code = message.text.trim().toLowerCase().replace('match report','').trim();
        getRawData(function(scoutData) {
            tba.getMatch(match_code, function(tbaData) {
                if (tbaData.Error)
                    return;

                let teams = [{team: tbaData.alliances.red.team_keys[0].replace('frc',''), booth: 'Red 1'},
                             {team: tbaData.alliances.red.team_keys[1].replace('frc',''), booth: 'Red 2'},
                             {team: tbaData.alliances.red.team_keys[2].replace('frc',''), booth: 'Red 3'},
                             {team: tbaData.alliances.blue.team_keys[0].replace('frc',''), booth: 'Blue 1'},
                             {team: tbaData.alliances.blue.team_keys[1].replace('frc',''), booth: 'Blue 2'},
                             {team: tbaData.alliances.blue.team_keys[2].replace('frc',''), booth: 'Blue 3'}];
                let blocks = [{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": 'Match report for match ' + tbaData.match_number
                        }
                    },{
                        "type": "divider"
                    }];
                for (const team of teams) {
                    let aggregate = aggergateScoutData(team.team, this.scoutData);
                    printPreScoutData(team, blocks, aggregate);
                }
                sendBlocks(blocks, 'Match report for ' + match_code, null);
            }.bind({ctx: this.ctx, scoutData: scoutData}));
        }.bind({ctx: this.ctx}));
    });
}

load();

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', ejs)

app.get('/', function(req, res) {
    res.render('index.ejs');
});

app.get('/event', function(req,res) {
    let code = req.query.eventCode;
    getRawData(function(results) {
        this.send(results);
    }.bind(res));
});

app.get('/team', function(req,res) {
    let number = req.query.number;
    getTeamName(number, res);
});

app.post('/', (req, res) => {
    res.sendStatus(200);
    tba_matchCallback(req.body);
});

async function sendBlocks(blocks, message, callback)
{
    try {
        const result = await web.chat.postMessage({
            channel: channelId,
            blocks: blocks,
            text: message
        });
        if (callback) callback();
    } catch (error) { }
}

function printPostMatch(payload)
{
    let match = payload.message_data.match.score_breakdown;
    let blue_teams = payload.message_data.match.alliances.blue.teams;
    let red_teams = payload.message_data.match.alliances.red.teams;

    return [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": 'Results for match ' + payload.message_data.match.comp_level + payload.message_data.match.match_number
            }
        },{
            "type": "divider"
        },{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": '*Red: ' + match.red.totalPoints + '(' + match.red.rp + 'RP)'
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `Teams: ${red_teams[0].replace('frc','')}, ${red_teams[1].replace('frc','')}, ${red_teams[2].replace('frc','')}`
            }
        }, {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": `Auto points ${match.red.autoPoints}`
                },
                {
                    "type": "mrkdwn",
                    "text": `Teleop points ${match.red.teleopPoints}`
                }
            ]
        },{
            "type": "divider"
        },{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": '*Blue: ' + match.blue.totalPoints + '(' + match.blue.rp + 'RP)'
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `Teams: ${blue_teams[0].replace('frc','')}, ${blue_teams[1].replace('frc','')}, ${blue_teams[2].replace('frc','')}`
            }
        }, {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": `Auto points ${match.blue.autoPoints}`
                },
                {
                    "type": "mrkdwn",
                    "text": `Teleop points ${match.blue.teleopPoints}`
                }
            ]
        }
    ];
}

function printPreScoutData(team, blocks, aggregate)
{
    blocks.push({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": '*' + team.team + ' (' + team.booth + ')*'
        }
    });
    blocks.push({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": `Auto
Upper: ${aggregate.cargo_auto_upper.toFixed(2)} | Lower: ${aggregate.cargo_auto_lower.toFixed(2)}`
            },
            {
                "type": "mrkdwn",
                "text": `Teleop
Upper: ${aggregate.cargo_teleop_upper.toFixed(2)} | Lower: ${aggregate.cargo_teleop_lower.toFixed(2)}`
            }
        ]
    });
    blocks.push({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": 'Climb: ' + aggregate.climb.toFixed(2)
            }
        ]
    });
    blocks.push({
            "type": "context",
        "elements": [
            {
                "type": "plain_text",
                "emoji": true,
                "text": 'Last Comment: ' + aggregate.last_comment
            }
        ]
    });
    blocks.push({
        "type": "divider"
    });
}

function aggergateScoutData(team, scoutData)
{

    let aggregate = {
        matches: 0,
        cargo_auto_upper: 0,
        cargo_auto_lower: 0,
        cargo_teleop_upper: 0,
        cargo_teleop_lower: 0,
        climb: 0,
        last_comment: ''
    };
    if (!(team in scoutData))
        return aggregate;

    for (const row of scoutData[team]) {
        aggregate.matches++;
        aggregate.cargo_auto_upper += parseFloat(row.cargo_auto_upper_made);
        aggregate.cargo_auto_lower += parseFloat(row.cargo_auto_lower_made);
        aggregate.cargo_teleop_upper += parseFloat(row.teleop_upper);
        aggregate.cargo_teleop_lower += parseFloat(row.teleop_lower);
        aggregate.climb += row.climb == 'Traversal' ? 4.0 : (row.climb == 'High Rung' ? 3.0 : (row.climb == 'Mid Rung' ? 2.0 : (row.climb == 'Low Rung' ? 1.0 : 0.0)));
        aggregate.last_comment = row.impression;
    }
    aggregate.cargo_auto_upper = aggregate.cargo_auto_upper / aggregate.matches;
    aggregate.cargo_auto_lower = aggregate.cargo_auto_lower / aggregate.matches;
    aggregate.cargo_teleop_upper = aggregate.cargo_teleop_upper / aggregate.matches;
    aggregate.cargo_teleop_lower = aggregate.cargo_teleop_lower / aggregate.matches;
    aggregate.climb = (aggregate.climb / aggregate.matches) * (15.0 / 4.0);

    return aggregate;
}

async function tba_matchCallback(payload)
{
    if (payload.message_type == 'match_score') {

        getRawData(function(scoutData) {
            tba.getTeamLastMatch(this.payload.message_data.event_key, 'frc6800', function(tbaData) {

                let teams = [{team: tbaData.alliances.red.team_keys[0].replace('frc',''), booth: 'Red 1'},
                             {team: tbaData.alliances.red.team_keys[1].replace('frc',''), booth: 'Red 2'},
                             {team: tbaData.alliances.red.team_keys[2].replace('frc',''), booth: 'Red 3'},
                             {team: tbaData.alliances.blue.team_keys[0].replace('frc',''), booth: 'Blue 1'},
                             {team: tbaData.alliances.blue.team_keys[1].replace('frc',''), booth: 'Blue 2'},
                             {team: tbaData.alliances.blue.team_keys[2].replace('frc',''), booth: 'Blue 3'}];
                let blocks = [{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": 'Pre-match report for match ' + tbaData.match_number
                        }
                    },{
                        "type": "divider"
                    }];
                for (const team of teams) {
                    let aggregate = aggergateScoutData(team.team, this.scoutData);
                    printPreScoutData(team, blocks, aggregate);
                }
                sendBlocks(blocks, 'PreScout report for match ' + tbaData.match_number, null);
            }.bind({ctx: this.ctx, payload: this.payload, scoutData: scoutData}));
        }.bind({ctx: this.ctx, payload: payload}))

    }
}

async function getTeamName(number, response)
{
    const sheet = doc.sheetsByTitle['Austin Team List'];
    await sheet.loadCells('A:B');

    let row = 1;
    while (sheet.getCell(row,0).value) {
        if (sheet.getCell(row,0).value == number) {
            response.send(sheet.getCell(row, 1).value);
            return;
        }
        row++;
    }
    response.send('N/A');
}

async function getRawData(callback)
{
    const sheet = doc.sheetsByTitle['RAW Scouting Data'];
    await sheet.loadCells('A:AM');

    let mapping = {
        team: 2,
        matchNum: 3,
        auto_behavior: 4,
        cargo_auto_upper_made: 5,
        cargo_auto_upper_attempt: 6,
        cargo_auto_lower_made: 7,
        cargo_auto_lower_attempt: 8,
        perf_intake: 21,
        perf_scoring: 22,
        perf_defense: 23,
        perf_drive: 29,
        teleop_upper: 24,
        teleop_lower: 25,
        climb: 28,
        impression: 30,
        comment: 31
    }

    let row = 1;
    let results = {};
    while (sheet.getCell(row,0).value) {

        let result = {};
        for (const [key, value] of Object.entries(mapping)) {
            result[key] = sheet.getCell(row, value).value;
        }
        result.matchKey = result.matchNum;
        row++;
        if (!(result.team in results)) {
            results[result.team] = [];
        }
        results[result.team].push(result);
    }
    callback(results);
}