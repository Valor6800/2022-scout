const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');

let keys = fs.readFileSync('keys.json');
let credentials = JSON.parse(keys);

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

	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
	const sheet = doc.sheetsByTitle['RAW Scouting Data'];
	await sheet.loadCells('A:AH');

	let mapping = {
		team: 2,
		matchNum: 3,
		start_pos: 5,
		auto_behavior: 13,
		cargo_auto_upper_made: 7,
		cargo_auto_upper_attempt: 8,
		cargo_auto_lower_made: 9,
		cargo_auto_lower_attempt: 10,
		cargo_auto_picked: 11,
		cargo_auto_picked_attempted: 12,
		perf_intake: 23,
		perf_scoring: 24,
		perf_defense: 25,
		perf_drive: 31,
		teleop_upper: 26,
		teleop_lower: 27,
		climb: 30,
		impression: 32,
		comment: 33
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
		if (!(result.team in results)) {
			results[result.team] = [];
		}
		results[result.team].push(result);
	}
	response.send(results);
}