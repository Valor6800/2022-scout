'use strict';

(function() {
    var root = this;

    var has_require = typeof require !== 'undefined';
    var request = root.request;
    if (typeof request === 'undefined') {
        if (has_require) {
            request = require('request');
        } else {
            throw new Error('Requires request');
        }
    }
    var math = root.math;
    if (typeof math === 'undefined') {
        if (has_require) {
            math = require('mathjs');
        } else {
            throw new Error('Requires math');
        }
    }
    var TBA_Generator = root.TBA_Generator;
    if (typeof TBA_Generator === 'undefined') {
        if (has_require) {
            TBA_Generator = require('./tba_generator.js');
        } else {
            throw new Error('Requires TBA_Generator');
        }
    }

    /**
     * Class to pull data from TBA (thebluealliance), as well as calculate component OPRs from resulting data
     * @author Michael Ray <mray190@gmail.com>
     */
    class TBA {

        setYear(year=2022)
        {
            this.year = year;
        }

        setAuthToken(token)
        {
            this.tba_auth_token = token;
        }

        /**
         * @constructor
         */
        constructor()
        {
            /**
             * @private
             */
            this.year = '2022';

            /**
             * @private
             */
            this.tba_base_url = 'https://www.thebluealliance.com/api/v3/';

            /**
             * @private
             */
            this.tba_auth_token = 'LCBZ7qqYrBR0e06C4QJEjaW1O7r2TZat7KZwvQcfDqShwIxV4N7epHK9lbafjc4M';

            /**
             * @private
             */
            this.component_opr_2019_keys = [
                'HatchRocketLow',
                'HatchRocketMid',
                'HatchRocketTop',
                'HatchShipFront',
                'HatchShipSide',
                'CargoRocketLow',
                'CargoRocketMid',
                'CargoRocketTop',
                'CargoShipFront',
                'CargoShipSide',
                'HabAuto',
                'HabEnd',
                'Penalty'
            ];

            /**
             * @private
             */
            this.component_opr_2020_keys = [
                'autoCellsBottom',
                'autoCellsInner',
                'autoCellsOuter',
                'teleopCellsBottom',
                'teleopCellsInner',
                'teleopCellsOuter',
                'move',
                'climb',
                'penalty',
                'rung_level',
                'panel'
            ];

            /**
             * @private
             */
            this.component_opr_2022_keys = [
                'autoCargoLower',
                'autoCargoUpper',
                'teleopCargoLower',
                'teleopCargoUpper',
                'quintet',
                'taxi',
                'climb',
                'penalty'
            ];

            /**
             * @private
             */
            this.component_opr_keys = this.component_opr_2022_keys;

            /**
             * @private
             */
            this.foul_idx = this.component_opr_keys.length - 1;

            /**
             * @private
             */
            this.cargo_tracking = [
                'autoCargoLowerNear',
                'autoCargoLowerFar',
                'autoCargoLowerBlue',
                'autoCargoLowerRed',
                'autoCargoUpperNear',
                'autoCargoUpperFar',
                'autoCargoUpperBlue',
                'autoCargoUpperRed',
                'teleopCargoLowerNear',
                'teleopCargoLowerFar',
                'teleopCargoLowerBlue',
                'teleopCargoLowerRed',
                'teleopCargoUpperNear',
                'teleopCargoUpperFar',
                'teleopCargoUpperBlue',
                'teleopCargoUpperRed'
            ];

            /**
             * @private
             */
            this.gen = new TBA_Generator();
        }

        /**
         * This callback is displayed as part of the Requester class.
         * @callback TBA~TBAResponseCallback
         * @param {number} responseCode
         * @param {string} responseMessage
         */

        /**
         * Get data from TheBlueAlliance
         * @private
         * @param {String} url - URL extension for TBA
         * @param {TBA~TBAResponseCallback} callback - Callback when data is acquired
         */
        httpGet(url, callback)
        {
            var options = {
                method: 'GET',
                url: this.tba_base_url + url,
                headers: {
                    'X-TBA-Auth-Key': this.tba_auth_token
                }
            };
            request(options, function (error, response, body) {
                if (error) console.log(error);
                callback(JSON.parse(body));
            });
        }

        // Event information

        getEvents(callback)
        {
            this.httpGet('events/' + this.year, callback);
        }

        /**
         * Get a list of teams at an event
         * @param {String} code - event code
         * @param {TBA~TBAResponseCallback} callback - Callback when data is acquired
         */
        getEvent(code, callback)
        {
            this.httpGet('event/' + code + '/simple', callback);
        }

        /**
         * Get a list of teams at an event
         * @param {String} code - event code
         * @param {TBA~TBAResponseCallback} callback - Callback when data is acquired
         */
        getTeams(code, callback)
        {
            this.httpGet('event/' + code + '/teams/keys', callback);
        }

        /**
         * Get a specific match
         * @param {String} match_code - match code
         * @param {TBA~TBAResponseCallback} callback - Callback when data is acquired
         */
        getMatch(match_code, callback)
        {
            this.httpGet('match/' + match_code, callback);
        }

        getMatches(code, callback)
        {
            if (code == '2022mray')
                callback(this.gen.genTournament(34, 10));
            else
                this.httpGet('event/' + code + '/matches', callback);
        }

        getOPRs(code, callback)
        {
            this.httpGet('event/' + code + '/oprs', function(stats) {
                callback(stats.oprs);
            });
        }

        getComponentOPRs(code, callback)
        {
            this.genOPRs(code, callback);
        }

        getLastMatch(code, callback)
        {
            this.getMatches(code, function(matches) {
                // Remove matches that haven't happened yet
                for (var match in matches) {
                    if (matches[match].comp_level == null) {
                        delete matches[match];
                    }
                }
                // Cleanse array of null objects
                var cleaned = matches.filter(function (el) {
                    return el != null;
                });
                // Sort by timestamp
                cleaned.sort(function(first, second) {
                  return second.post_result_time - first.post_result_time;
                });
                // Get latest match
                callback(cleaned[0]);
            });
        }

        getNextMatch(code, callback)
        {
            this.getMatches(code, function(matches) {
                for (var match in matches) {
                    if (matches[match].actual_time != null) {
                        delete matches[match];
                    }
                }
                var cleaned = matches.filter(function (el) {
                    return el != null;
                });
                // Sort by timestamp
                cleaned.sort(function(first, second) {
                  return first.post_result_time - second.post_result_time;
                });
                // Get next match
                callback(cleaned[0]);
            });
        }

        // Team information

        getTeamStatus(code, team_code, callback)
        {
            this.httpGet('team/' + team_code + '/event/' + code + '/status', callback);
        }

        getTeamEvents(team_code, callback)
        {
            this.httpGet('team/' + team_code + '/events/' + this.year + '/statuses', callback);
        }

        getOverallTeamNextMatch(team_code, callback, simulated=false)
        {

            if (simulated) {
                let teams = {'red': [team_code, 'frc6800', 'frc27'], 'blue': ['frc49', 'frc1717', 'frc330']};
                callback(this.gen.genMatch(this.gen.rnd(60) + 1, teams));
            } else {
                var that = this;
                that.getTeamEvents(team_code, function (events) {
                    for (var event in events) {
                        if (events[event]) {
                            if (events[event].next_match_key) {
                                that.getMatch(events[event].next_match_key, callback);
                                return;
                            }
                        }
                    }
                    callback(null);
                });
            }
        }

        getOverallTeamLastMatch(team_code, callback)
        {
            var that = this;
            var last_match_key = null;
            that.getTeamEvents(team_code, function (events) {
                for (var event in events) {
                    if (events[event]) {
                        if (events[event].last_match_key) {
                            last_match_key = events[event].last_match_key;
                            that.getMatch(last_match_key, callback);
                            return;
                        }
                    }
                }
            });
        }

        getTeamLastMatch(code, team_code, callback)
        {
            var that = this;
            that.getTeamStatus(code, team_code, function(status) {
                that.getMatch(status.last_match_key, callback);
            });
        }

        getTeamNextMatch(code, team_code, callback)
        {
            var that = this;
            that.getTeamStatus(code, team_code, function(status) {
                that.getMatch(status.next_match_key, callback);
            });
        }

        getTeamAlliance(code, team_code, callback)
        {
            this.getTeamStatus(code, team_code, function(status) {
                callback(status.alliance);
            });
        }

        getTeamRank(code, team_code, callback)
        {
            this.getTeamStatus(code, team_code, function(status) {
                callback(status.qual.ranking.rank);
            });
        }

        // Internal helper functions (generic)

        parseMatch(complete_match_data, ballCounts)
        {
            var results = {};
            var match = complete_match_data.score_breakdown;

            let colors = ['blue', 'red'];
            let fouls = [0, 0];
            for (var color in colors) {
                let sums = this.parse2022Match(match[colors[color]]);
                for (var i = 0; i < 3; i++) {
                    var robot = parseInt(complete_match_data.alliances[colors[color]].team_keys[i].replace('frc', ''));
                    if (!(robot in results)) {
                        results[robot] = {};
                    }
                    if (!(robot in ballCounts)) {
                        ballCounts[robot] = {};
                    }
                    this.parse2022CargoExits(colors[color], match, ballCounts[robot]);
                    for (var j = 0; j < this.component_opr_keys.length; j++) {
                        if (j === this.foul_idx) {
                            fouls[1 - color] = sums[this.component_opr_keys[j]];
                        } else {
                            results[robot][this.component_opr_keys[j]] = sums[this.component_opr_keys[j]];
                        }
                    }
                    results[robot].teams_played_with = [
                        parseInt(complete_match_data.alliances[colors[color]].team_keys[0].replace('frc', '')),
                        parseInt(complete_match_data.alliances[colors[color]].team_keys[1].replace('frc', '')),
                        parseInt(complete_match_data.alliances[colors[color]].team_keys[2].replace('frc', ''))
                    ];
                }
            }
            for (var color in colors) {
                for (var i = 0; i < 3; i++) {
                    var robot = parseInt(complete_match_data.alliances[colors[color]].team_keys[i].replace('frc', ''));
                    results[robot][this.component_opr_keys[this.foul_idx]] = fouls[color];
                }
            }
            return results;
        }

        countInArray(array, value) {
            return array.reduce((n, x) => n + (x === value), 0);
        }

        genCSV(oprs, callback = null)
        {
            process.stdout.write("team,opr,oprp,");
            for (var j = 0; j < this.component_opr_keys.length; j++) {
                process.stdout.write(this.component_opr_keys[j] + ",");
            }
            let modes = ['auto', 'teleop'];
            let zones = ['Lower', 'Upper'];
            let outputs = ['Front', 'Back', 'Left', 'Right'];
            for (var mode = 0; mode < modes.length; mode++) {
                for (var zone = 0; zone < zones.length; zone++) {
                    for (var output = 0; output < outputs.length; output++) {
                        process.stdout.write(modes[mode] + zones[zone] + outputs[output] + ",");
                    }
                }
            }
            process.stdout.write("\n");
            for (var team in oprs) {
                process.stdout.write(team + ",");
                for (var element in oprs[team]) {
                    process.stdout.write(oprs[team][element].toFixed(3) + ",");
                }
                process.stdout.write("\n");
            }

            if (callback)
                callback(oprs);
        }

        fillBallCounts(oprs, ballCounts)
        {
            let modes = ['auto', 'teleop'];
            let zones = ['Lower', 'Upper'];
            let outputs = ['Front', 'Back', 'Left', 'Right'];
            for (const [team, value] of Object.entries(ballCounts)) {
                if (team != 0) {
                    for (var mode = 0; mode < modes.length; mode++) {
                        for (var zone = 0; zone < zones.length; zone++) {
                            for (var output = 0; output < outputs.length; output++) {
                                oprs[team][modes[mode] + zones[zone] + outputs[output]] = ballCounts[team][modes[mode]][zones[zone]][outputs[output]];
                            }
                        }
                    }
                }
            }
        }

        genOPRs(eventCode, callback, gen_csv = false)
        {
            this.getMatches(eventCode, function(matches) {
                var results = {};
                if (matches.length == 0) {
                    callback(null);
                    return null;
                }
                let ballCounts = {};
                for (var match in matches) {
                    if (matches[match].actual_time && (
                        matches[match].comp_level === 'qm')) {
                        var parsed_match = this.parseMatch(matches[match], ballCounts);
                        for (var team in parsed_match) {

                            // Initialize entrys
                            if (!(team in results)) {
                                results[team] = {
                                    'matches': 0,
                                    'teams_played_with': []
                                };
                                for (var i = 0; i < this.component_opr_keys.length; i++) {
                                    results[team][this.component_opr_keys[i]] = 0;
                                }
                            }

                            // Fill sum table
                            results[team].matches += 1;
                            for (var i = 0; i < this.component_opr_keys.length; i++) {
                                let key = this.component_opr_keys[i];
                                results[team][key] += parsed_match[team][key];
                            }
                            results[team].teams_played_with = results[team].teams_played_with.concat(parsed_match[team].teams_played_with);
                        }
                    }
                }

                var A = [];
                var B = {};

                // OPR formula is Ax = B[z]
                //   where A is a square matrix NxN
                //   where N is the amount of teams
                //   where B is a ZxN matrix
                //   where x is a 1xN matrix
                //   where Z is the amount of components you want OPRs for
                //   where B[z] is a specific component you want an OPR for

                // A represents which teams have played with each other
                //   Diagonal is a team playing itself, so the number of matches the team played
                // B represents the sum of a component you are trying to solve for

                // Set the sum arrays to empty
                for (var i = 0; i < this.component_opr_keys.length; i++) {
                    B[this.component_opr_keys[i]] = [];
                }

                for (var team in results) {
                    // Figure out for a specific team  which teams that team has played with
                    // Ex.
                    //   Say 118, 148, 2468 played against 6800, 418, 8000
                    //   The A matrix would look like:
                    //        118  148  418  2468 6800 8000
                    //   118  [1    1    0    1    0    0]
                    //   148  [1    1    0    1    0    0]
                    //   418  [0    0    1    0    1    1]
                    //   2468 [1    1    0    1    0    0]
                    //   6800 [0    0    1    0    1    1]
                    //   8000 [0    0    1    0    1    1]
                    var row = [];
                    for (var comparing_team in results) {
                        row.push(this.countInArray(results[comparing_team].teams_played_with, parseInt(team)));
                    }
                    A.push(row);

                    // Put in each sub array of B the sum for that specific component the team has scored
                    // Ex.
                    //   Say 118 scored 543 total points for component 0, and 234 for component 1
                    //   Say 148 scored 856 total points for component 0, and 134 for component 1
                    //   Say 6800 scored 245 total points for component 0, and 328 for component 1
                    //   [[543] [234]]
                    //   [[856] [134]]
                    //   [[245] [328]]
                    for (var i = 0; i < this.component_opr_keys.length; i++) {
                        B[this.component_opr_keys[i]].push(results[team][this.component_opr_keys[i]]);
                    }
                }

                // Solve Ax = B[z] for each z
                var opr_arrays = {};
                for (var i = 0; i < this.component_opr_keys.length; i++) {
                    opr_arrays[this.component_opr_keys[i]] = math.lusolve(A, B[this.component_opr_keys[i]]);
                }

                // Reformat the final array to give each team a dictionary for their component OPRs
                var oprs = {};
                var i = 0;
                for (var team in results) {
                    if (team == 0)
                        continue;
                    oprs[team] = {'opr': 0, 'oprp': 0};
                    for (var j = 0; j < this.component_opr_keys.length; j++) {
                        oprs[team][this.component_opr_keys[j]] = opr_arrays[this.component_opr_keys[j]][i][0];
                        if (j === this.foul_idx) {
                            oprs[team].oprp -= oprs[team][this.component_opr_keys[j]];
                        } else {
                            oprs[team].opr += oprs[team][this.component_opr_keys[j]];
                            oprs[team].oprp += oprs[team][this.component_opr_keys[j]];
                        }
                    }
                    i++;
                }
                this.fillBallCounts(oprs,ballCounts);
                if (gen_csv)
                    this.genCSV(oprs, callback);
                else
                    callback(oprs);
            }.bind(this));
        }

        parse2022Cargo(color, match)
        {
            let sums = {};
            for (var i = 0; i < this.cargo_tracking.length; i++) {
                sums[this.cargo_tracking[i]] = {'red': 0, 'blue': 0};
            }
        }

        parse2022CargoExits(color, match, ballCountsForTeam)
        {
            let modes = ['auto', 'teleop'];
            let zones = ['Lower', 'Upper'];
            for (var mode = 0; mode < modes.length; mode++) {
                if (!(modes[mode] in ballCountsForTeam))
                    ballCountsForTeam[modes[mode]] = {};
                for (var zone = 0; zone < zones.length; zone++) {
                    if (!(zones[zone] in ballCountsForTeam[modes[mode]]))
                        ballCountsForTeam[modes[mode]][zones[zone]] = {
                            'Front': 0,
                            'Back': 0,
                            'Left': 0,
                            'Right': 0
                        };
                    let key = modes[mode] + 'Cargo' + zones[zone];
                    let matchColor = match[color];

                    ballCountsForTeam[modes[mode]][zones[zone]]['Front'] += matchColor[key + (color == 'red' ? 'Red' : 'Blue')];
                    ballCountsForTeam[modes[mode]][zones[zone]]['Back'] += matchColor[key + (color == 'red' ? 'Blue' : 'Red')];
                    ballCountsForTeam[modes[mode]][zones[zone]]['Left'] += matchColor[key + (color == 'red' ? 'Near' : 'Far')];
                    ballCountsForTeam[modes[mode]][zones[zone]]['Right'] += matchColor[key + (color == 'red' ? 'Far' : 'Near')];
                }
            }
        }

        parse2022Match(match)
        {
            let sums = {};
            for (var i = 0; i < this.component_opr_keys.length; i++) {
                sums[this.component_opr_keys[i]] = 0;
            }

            sums[this.component_opr_keys[0]] = match['autoCargoLowerNear'] * 2 +
                                               match['autoCargoLowerFar'] * 2 +
                                               match['autoCargoLowerBlue'] * 2 +
                                               match['autoCargoLowerRed'] * 2;
            sums[this.component_opr_keys[1]] = match['autoCargoUpperNear'] * 4 +
                                               match['autoCargoUpperFar'] * 4 +
                                               match['autoCargoUpperBlue'] * 4 +
                                               match['autoCargoUpperRed'] * 4;
            sums[this.component_opr_keys[2]] = match['teleopCargoLowerNear'] +
                                               match['teleopCargoLowerFar'] +
                                               match['teleopCargoLowerBlue'] +
                                               match['teleopCargoLowerRed'];
            sums[this.component_opr_keys[3]] = match['teleopCargoUpperNear'] * 2 +
                                               match['teleopCargoUpperFar'] * 2 +
                                               match['teleopCargoUpperBlue'] * 2+
                                               match['teleopCargoUpperRed'] * 2;

            // Hab game element
            for (var i = 1; i <= 3; i++) {
                sums[this.component_opr_keys[5]] += match['taxiRobot' + i] === 'Yes' ? 2 : 0;
                sums[this.component_opr_keys[6]] += match['endgameRobot' + i] === 'Traversal' ? 15 :
                                                   (match['endgameRobot' + i] === 'High' ? 10 :
                                                   (match['endgameRobot' + i] === 'Mid' ? 6 :
                                                   (match['endgameRobot' + i] === 'Low' ? 4 : 0)));
            }

            // Foul points
            sums[this.component_opr_keys[this.foul_idx]] += match['foulPoints'];

            // Return element sum array
            return sums;
        }

        parse2020Match(match)
        {
            let sums = {};
            for (var i = 0; i < this.component_opr_keys.length; i++) {
                sums[this.component_opr_keys[i]] = 0;
            }

            for (var i = 0; i < 6; i++) {
                sums[this.component_opr_keys[i]] = match[this.component_opr_keys[i]];
                if (this.component_opr_keys[i].includes('Outer')) {
                    if (this.component_opr_keys[i].includes('auto'))
                        sums[this.component_opr_keys[i]] *= 4;
                    else
                        sums[this.component_opr_keys[i]] *= 2;
                }
                else if (this.component_opr_keys[i].includes('Inner')) {
                    if (this.component_opr_keys[i].includes('auto'))
                        sums[this.component_opr_keys[i]] *= 6;
                    else
                        sums[this.component_opr_keys[i]] *= 3;
                }
                else if (this.component_opr_keys[i].includes('Bottom')) {
                    if (this.component_opr_keys[i].includes('auto'))
                        sums[this.component_opr_keys[i]] *= 2;
                    else
                        sums[this.component_opr_keys[i]] *= 1;
                }
            }

            // Hab game element
            for (var i = 1; i <= 3; i++) {
                sums[this.component_opr_keys[6]] += match['initLineRobot' + i] === 'Exited' ? 5 : 0;
                sums[this.component_opr_keys[7]] += match['endgameRobot' + i] === 'Hang' ? 25 : (match['endgameRobot' + i] === 'Park' ? 5 : 0);
            }

            // Foul points
            sums[this.component_opr_keys[8]] += match['foulPoints'];
            sums[this.component_opr_keys[9]] += (match['endgameRungIsLevel'] === 'IsLevel' && sums[this.component_opr_keys[7]] > 15) ? 15 : 0;
            sums[this.component_opr_keys[10]] += match['controlPanelPoints'];

            // Return element sum array
            return sums;
        }

        parse2019Match(match)
        {
            let sums = {};
            for (var i = 0; i < this.component_opr_keys.length; i++) {
                sums[this.component_opr_keys[i]] = 0;
            }

            // Cargoship game element
            for (var i = 1; i <= 8; i++) {
                let bay = match['bay' + i].replace('And', '');
                let scored_bay = bay.replace(match['preMatchBay' + i], '');

                let index = -1;

                if (scored_bay.includes('Cargo')) {
                    index = (i == 4 || i == 5) ? 8 : 9;
                    sums[this.component_opr_keys[index]]++;
                }

                if (scored_bay.includes('Panel')) {
                    index = (i == 4 || i == 5) ? 3 : 4;
                    sums[this.component_opr_keys[index]]++;
                }
            }

            // Rocket game element
            var tba_scoring_keys = [
                'lowLeftRocketFar',
                'lowRightRocketFar',
                'lowLeftRocketNear',
                'lowRightRocketNear',
                'midLeftRocketFar',
                'midRightRocketFar',
                'midLeftRocketNear',
                'midRightRocketNear',
                'topLeftRocketFar',
                'topRightRocketFar',
                'topLeftRocketNear',
                'topRightRocketNear'
            ];
            for (var i = 0; i < tba_scoring_keys.length; i++) {
                let slot = match[tba_scoring_keys[i]].replace('And', '');

                let index = -1;

                if (slot.includes('Cargo')) {
                    index = (tba_scoring_keys[i].includes('low')) ? 5 :
                            (tba_scoring_keys[i].includes('mid')) ? 6 : 7;
                    sums[this.component_opr_keys[index]]++;
                }
                if (slot.includes('Panel')) {
                    index = (tba_scoring_keys[i].includes('low')) ? 0 :
                            (tba_scoring_keys[i].includes('mid')) ? 1 : 2;
                    sums[this.component_opr_keys[index]]++;
                }
            }

            // Hab game element
            for (var i = 1; i <= 3; i++) {
                let robot_start = parseInt(match['preMatchLevelRobot' + i].replace('HabLevel', ''));
                let robot_climb = parseInt(match['endgameRobot' + i].replace('HabLevel', ''));
                let robot_auto_move = match['habLineRobot' + i] == 'CrossedHabLineInSandstorm';

                sums[this.component_opr_keys[11]] += ((robot_climb == 3) ? 12 :
                                                      (robot_climb == 2) ? 6 :
                                                      (robot_climb == 1) ? 3 : 0);
                if (robot_auto_move)
                    sums[this.component_opr_keys[10]] += ((robot_start == 2) ? 6 : 3);
            }

            // Foul points
            sums[this.component_opr_keys[12]] += match['foulPoints'];

            // Convert scored elements into points
            for (var i = 0; i < 5; i++) {
                sums[this.component_opr_keys[i]] *= 2;
            }
            for (var i = 5; i < 10; i++) {
                sums[this.component_opr_keys[i]] *= 3;
            }

            // Return element sum array
            return sums;
        }

    };

    if ( typeof exports !== 'undefined' ) {
        if ( typeof module !== 'undefined' && module.exports ) {
            exports = module.exports = TBA;
        }
        exports.TBA = TBA;
    } else {
        root.TBA = TBA;
    }

}).call(this);
