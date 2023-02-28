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
                "text": `Auto Cone
High: ${aggregate.auto_cone_high.toFixed(1)} | Mid: ${aggregate.auto_cone_mid.toFixed(1)} | Low: ${aggregate.auto_cone_low.toFixed(1)} `
            },
            {
                "type": "mrkdwn",
                "text": `Teleop Cone
High: ${aggregate.teleop_cone_high.toFixed(1)} | Mid: ${aggregate.teleop_cone_mid.toFixed(1)} | Low: ${aggregate.teleop_cone_low.toFixed(1)} `
            }
        ]
    });
    blocks.push({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": `Auto Cube
High: ${aggregate.auto_cube_high.toFixed(1)} | Mid: ${aggregate.auto_cube_mid.toFixed(1)} | Low: ${aggregate.auto_cube_low.toFixed(1)} `
            },
            {
                "type": "mrkdwn",
                "text": `Teleop Cube
High: ${aggregate.teleop_cube_high.toFixed(1)} | Mid: ${aggregate.teleop_cube_mid.toFixed(1)} | Low: ${aggregate.teleop_cube_low.toFixed(1)} `
            }
        ]
    });
    blocks.push({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": `Auto - Docked: ${(aggregate.auto_charge.docked * 100).toFixed(0)}% - Engaged: ${(aggregate.auto_charge.engaged * 100).toFixed(0)}%`
            }
        ]
    });
    blocks.push({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": `Teleop - Docked: ${(aggregate.teleop_charge.docked * 100).toFixed(0)}% - Engaged: ${(aggregate.teleop_charge.engaged * 100).toFixed(0)}%`
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
        auto_cone_high: 0,
        auto_cone_mid: 0,
        auto_cone_low: 0,
        auto_cube_high: 0,
        auto_cube_mid: 0,
        auto_cube_low: 0,
        teleop_cone_high: 0,
        teleop_cone_mid: 0,
        teleop_cone_low: 0,
        teleop_cube_high: 0,
        teleop_cube_mid: 0,
        teleop_cube_low: 0,
        auto_charge: {mobility: 0, docked: 0, engaged: 0},
        teleop_charge: {parked: 0, docked: 0, engaged: 0},
        last_comment: ''
    };
    if (!(team in scoutData))
        return aggregate;

    for (const row of scoutData[team]) {
        aggregate.matches++;
        aggregate.auto_cone_high += parseFloat(row.auto_cone_high);
        aggregate.auto_cone_mid += parseFloat(row.auto_cone_mid);
        aggregate.auto_cone_low += parseFloat(row.auto_cone_low);
        aggregate.auto_cube_high += parseFloat(row.auto_cube_high);
        aggregate.auto_cube_mid += parseFloat(row.auto_cube_mid);
        aggregate.auto_cube_low += parseFloat(row.auto_cube_low);
        aggregate.teleop_cone_high += parseFloat(row.teleop_cone_high);
        aggregate.teleop_cone_mid += parseFloat(row.teleop_cone_mid);
        aggregate.teleop_cone_low += parseFloat(row.teleop_cone_low);
        aggregate.teleop_cube_high += parseFloat(row.teleop_cube_high);
        aggregate.teleop_cube_mid += parseFloat(row.teleop_cube_mid);
        aggregate.teleop_cube_low += parseFloat(row.teleop_cube_low);

        if (row.auto_charge) {
            if (row.auto_charge.includes('Mobility')) aggregate.auto_charge.mobility++;
            if (row.auto_charge.includes('Docked')) aggregate.auto_charge.docked++;
            if (row.auto_charge.includes('Engaged')) aggregate.auto_charge.engaged++;
        }
        if (row.teleop_charge) {
            if (row.teleop_charge.includes('Parked')) aggregate.teleop_charge.parked++;
            if (row.teleop_charge.includes('Docked')) aggregate.teleop_charge.docked++;
            if (row.teleop_charge.includes('Engaged')) aggregate.teleop_charge.engaged++;
        }
        aggregate.last_comment = row.comment;
    }

    if (aggregate.matches < 1)
        return aggregate;

    aggregate.auto_cone_high /= aggregate.matches;
    aggregate.auto_cone_mid /= aggregate.matches;
    aggregate.auto_cone_low /= aggregate.matches;
    aggregate.auto_cube_high /= aggregate.matches;
    aggregate.auto_cube_mid /= aggregate.matches;
    aggregate.auto_cube_low /= aggregate.matches;
    aggregate.teleop_cone_high /= aggregate.matches;
    aggregate.teleop_cone_mid /= aggregate.matches;
    aggregate.teleop_cone_low /= aggregate.matches;
    aggregate.teleop_cube_high /= aggregate.matches;
    aggregate.teleop_cube_mid /= aggregate.matches;
    aggregate.teleop_cube_low /= aggregate.matches;    
    aggregate.auto_charge.mobility /= aggregate.matches;
    aggregate.auto_charge.docked /= aggregate.matches;
    aggregate.auto_charge.engaged /= aggregate.matches;
    aggregate.teleop_charge.parked /= aggregate.matches;
    aggregate.teleop_charge.docked /= aggregate.matches;
    aggregate.teleop_charge.engaged /= aggregate.matches;

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
    const sheet = doc.sheetsByTitle['Quick Look'];
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

function colToNum(col) {
    if (col.length > 1) return col.substring(1).charCodeAt(0) - 65 +26;
    return col.charCodeAt(0) - 65;
}

async function getRawData(callback)
{
    const sheet = doc.sheetsByTitle['RAW Scouting Data'];
    await sheet.loadCells('A:AC');

    let mapping = {
        team: 'B',
        matchNum: 'A',
        auto_charge: 'H',
        auto_cone_high: 'I',
        auto_cone_mid: 'J',
        auto_cone_low: 'K',
        auto_cube_high: 'L',
        auto_cube_mid: 'M',
        auto_cube_low: 'N',
        teleop_cone_high: 'O',
        teleop_cone_mid: 'P',
        teleop_cone_low: 'Q',
        teleop_cube_high: 'R',
        teleop_cube_mid: 'S',
        teleop_cube_low: 'T',
        teleop_charge: 'U',
        perf_scoring: 'E',
        perf_defense: 'D',
        perf_drive: 'F',
        comment: 'W'
    }

    let row = 1;
    let results = {};
    while (sheet.getCell(row,0).value) {
        let result = {};
        for (const [key, value] of Object.entries(mapping)) {
            let defaultVal = 0;
            if (key == 'auto_charge' || key == 'teleop_charge' || key == 'comment') defaultVal = '';
            result[key] = sheet.getCell(row, colToNum(value)).value ? sheet.getCell(row, colToNum(value)).value : defaultVal;
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