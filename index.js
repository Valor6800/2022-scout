const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');

let keys = fs.readFileSync('keys.json');
let credentials = JSON.parse(keys);

var eventCode = "2024txwac"

var TBA = require('./src/tba.js');
const { match } = require('assert');
var tba = new TBA();

const doc = new GoogleSpreadsheet(credentials.spreadsheet);

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', ejs)

app.get('/', function(req, res) {
	res.render('index.ejs');
});

app.get('/event', function(req,res) {
	let code = req.query.eventCode;
	getRawData(code, res);
});

app.get('/team', function(req,res) {
	let number = req.query.number;
	getTeamName(number, res);
});

app.get('/errors', function(req, res) {
	const tbaResults = {}
	tba.getMatches(eventCode, function(matches) {
		matches.forEach(match => {
			if (match.comp_level == "qm") {
				const blueTeams = match.alliances.blue.team_keys;
				const redTeams = match.alliances.red.team_keys;
				if (match.score_breakdown && match.score_breakdown.blue) {
					const blueBreakdown = match.score_breakdown.blue;
					const blueResults = parseAlliance("blue", blueTeams, blueBreakdown);
					const redBreakdown = match.score_breakdown.red;
					const redResults = parseAlliance("red", redTeams, redBreakdown);
					const matchResults = Object.assign({}, blueResults, redResults);
					tbaResults[match.match_number] = matchResults
				}
			}
		});
		readSpreadsheet(eventCode).then(function(results) {
			var data = combineTbaWithExcel(this.tbaResults, results);
			res.send(data);
		}.bind({tbaResults: tbaResults, context: this, res: res}));
	});
});

app.listen(8080);
console.log('Server is listening on port 8080');

async function getTeamName(number, response) {

	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
	const sheet = doc.sheetsByTitle['Kettering Week 0 Team List'];
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

async function getRawData(event, response) {
	results = readSpreadsheet(event);
	response.send(results);
}

async function readSpreadsheet(event) {

	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
	const sheet = doc.sheetsByTitle['QRScout Data'];
	await sheet.loadCells('A:X');

	let mapping = {
		position: 2,
		scoutName: 0,
		team: 3,
		matchNum: 1,
		start_pos: 6,
		auto_speaker: 9,
		auto_amp: 8,
		mobility: 7,
		end: 14,
		teleop_amp: 11,
		coop: 10,
		teleop_speaker: 12,
		trap: 13,
	}

	let row = 1;
	let results = {};
	while (sheet.getCell(row,0).value) {

		let result = {};
		for (const [key, value] of Object.entries(mapping)) {
			result[key] = sheet.getCell(row, value).value;
		}
		result.matchKey = event + '_qm' + result.matchNum;
		row++;
		if (!(result.matchNum in results))
			results[result.matchNum] = {};
		results[result.matchNum][result.team] = result
	}
	return results;
}

function parseAlliance(color, teams, breakdown)
{
	let results = {};
	for (var i = 0; i < teams.length; i++) {
		let key = teams[i].replace("frc","")
		let indvBreakdown = {};
		indvBreakdown.mobility = breakdown['autoLineRobot' + (i+1)] == "Yes"
		indvBreakdown.endGame = breakdown['endGameRobot' + (i+1)].includes("Stage") ? "Stage" :
			breakdown['endGameRobot' + (i+1)] == "Parked" ? "Parked" : "None"
		indvBreakdown.coop = breakdown.coopNotePlayed;
		indvBreakdown.teleopNotes = breakdown.teleopSpeakerNoteCount + breakdown.teleopSpeakerNoteAmplifiedCount;
		indvBreakdown.teleopAmp = breakdown.teleopAmpNoteCount;
		indvBreakdown.autoNotes = breakdown.autoSpeakerNoteCount;
		indvBreakdown.autoAmp = breakdown.autoAmpNoteCount;
		indvBreakdown.alliance = color;
		results[key] = indvBreakdown;
	}
	return results;
}

function combineTbaWithExcel(tbaResults, excelResults) {

	let matchErrors = {}
	let studentErrors = {}

	for (const [matchNum, matchData] of Object.entries(tbaResults)) {
		if (matchNum in excelResults) {
			var blueCounts = {}
			var redCounts = {}
			for (const [team, teamData] of Object.entries(matchData)) {
				if (teamData.alliance == "blue") {
					blueCounts = teamData
				} else {
					redCounts = teamData
				}
			}

			const tempErrors = {
				"red": {
					teleopSpeaker: redCounts.teleopNotes,
					teleopAmp: redCounts.teleopAmp,
					autoSpeaker: redCounts.autoNotes,
					autoAmp: redCounts.autoAmp,
				},
				"blue": {
					teleopSpeaker: blueCounts.teleopNotes,
					teleopAmp: blueCounts.teleopAmp,
					autoSpeaker: blueCounts.autoNotes,
					autoAmp: blueCounts.autoAmp,
				}
			}

			matchErrors[matchNum] = {
				"red": {
					mobility: 0,
					coop: 0,
					endGame: 0
				},
				"blue": {
					mobility: 0,
					coop: 0,
					endGame: 0
				}
			}

			let scouts = {
				"red": [],
				"blue": []
			}

			var excelTeamResults = excelResults[matchNum];
			// Go through TBA data
			for (const [team, teamData] of Object.entries(matchData)) {
				var teamAlliance = teamData.alliance;
				// If excel data is missing a specific team, add to match error but don't punish kid
				if (!(team in excelTeamResults)) {
					matchErrors[matchNum][teamAlliance].mobility += 1;
					matchErrors[matchNum][teamAlliance].endGame += 1;
					matchErrors[matchNum][teamAlliance].coop += 1;
				// Excel data has a team! 1:1 match, calculate match and student error
				} else {					
					var excelTeamResult = excelTeamResults[team];

					var scout = excelTeamResult.scoutName.replace(/\W/g, '');
					scouts[teamAlliance].push(scout)

					if (!(scout in studentErrors)) {
						studentErrors[scout] = {
							teleopSpeaker: 0,
							teleopAmp: 0,
							autoSpeaker: 0,
							autoAmp: 0,
							mobility: 0,
							coop: 0,
							endGame: 0,
							matches: 0,
							total: 0
						}
					}
					studentErrors[scout].matches++

					tempErrors[teamAlliance].teleopSpeaker -= excelTeamResult.teleop_speaker;
					tempErrors[teamAlliance].teleopAmp -= excelTeamResult.teleop_amp;
					tempErrors[teamAlliance].autoSpeaker -= excelTeamResult.auto_speaker;
					tempErrors[teamAlliance].autoAmp -= excelTeamResult.auto_amp;

					let end = excelTeamResult.end.toLowerCase() == "os" ||
							  excelTeamResult.end.toLowerCase() == "sl" ? "Stage" : (
								  excelTeamResult.end.toLowerCase() == "fc" ||
								  excelTeamResult.end.toLowerCase() == "p" ? "Parked" : "None"
							  )

					if (end != teamData.endGame) {
						studentErrors[scout].endGame++;
						matchErrors[matchNum][teamAlliance].endGame++;
					}
					if (excelTeamResult.mobility != teamData.mobility) {
						studentErrors[scout].mobility++;
						matchErrors[matchNum][teamAlliance].mobility++;
					}
					if (excelTeamResult.coop != teamData.coop) {
						studentErrors[scout].coop++;
						matchErrors[matchNum][teamAlliance].coop++;
					}
				}
			}
			for (const [alliance, scoutList] of Object.entries(scouts)) {
				matchErrors[matchNum][alliance].teleopSpeaker = Math.abs(tempErrors[alliance].teleopSpeaker);
				matchErrors[matchNum][alliance].teleopAmp = Math.abs(tempErrors[alliance].teleopAmp);
				matchErrors[matchNum][alliance].autoSpeaker = Math.abs(tempErrors[alliance].autoSpeaker);
				matchErrors[matchNum][alliance].autoAmp = Math.abs(tempErrors[alliance].autoAmp);
				scoutList.forEach(scout => {
					studentErrors[scout].teleopSpeaker += matchErrors[matchNum][alliance].teleopSpeaker;
					studentErrors[scout].teleopAmp += matchErrors[matchNum][alliance].teleopAmp;
					studentErrors[scout].autoSpeaker += matchErrors[matchNum][alliance].autoSpeaker;
					studentErrors[scout].autoAmp += matchErrors[matchNum][alliance].autoAmp;
				});
			}
		}
	}

	for (const [scout, scoutData] of Object.entries(studentErrors)) {
		scoutData.total = scoutData.endGame * 3 +
			scoutData.mobility * 3 +
			scoutData.coop * 5 +
			scoutData.teleopSpeaker + scoutData.teleopAmp +
			scoutData.autoSpeaker + scoutData.autoAmp
		scoutData.avg = scoutData.total / scoutData.matches
	}

	return {
		studentErrors: studentErrors,
		matchErrors: matchErrors,
	}
}