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

    class TBA_Generator {

        constructor()
        {
        }

        getDummyMatch()
        {
            return  {
                "actual_time": 0,
                "post_result_time": 0,
                "predicted_time": 0,
                "time": 0,
                "alliances": {
                  "blue": {
                    "dq_team_keys": [],
                    "score": 0,
                    "surrogate_team_keys": [],
                    "team_keys": []
                  },
                  "red": {
                    "dq_team_keys": [],
                    "score": 0,
                    "surrogate_team_keys": [],
                    "team_keys": []
                  }
                },
                "comp_level": "",
                "event_key": "",
                "key": "",
                "match_number": 0,
                "score_breakdown": {
                    "red": { },
                    "blue": { },
                },
                "set_number": 0,
                "videos": [],
                "winning_alliance": ""
            };
        }

        genTournament(teamCount, matchesPerTeam)
        {
            let matches = [];
            let matchSchedule = this.genMatchSchedule(teamCount, matchesPerTeam);
            for (let i = 1; i <= matchSchedule.length; i++) {
                let match = this.genMatch(i, matchSchedule[i - 1]);
                matches.push(match);
            }
            return matches;
        }

        genMatch(matchNum, teams)
        {
            let match = this.getDummyMatch();

            match.actual_time = this.rnd(100000000);
            match.post_result_time = match.actual_time;
            match.predicted_time = match.actual_time;
            match.time = match.actual_time;

            this.fillScoreBreakdown(match.score_breakdown.red);
            this.fillScoreBreakdown(match.score_breakdown.blue);

            match.alliances.blue.score = match.score_breakdown.blue.totalPoints + match.score_breakdown.red.foulPoints;
            match.alliances.red.score = match.score_breakdown.red.totalPoints + match.score_breakdown.blue.foulPoints;

            match.alliances.red.team_keys = teams.red;
            match.alliances.blue.team_keys = teams.blue;

            match.match_number = matchNum;
            match.event_key = '2022mray';
            match.comp_level = 'qm';
            match.key = match.event_key + '_' + match.comp_level + match.match_number;

            match.winning_alliance = match.alliances.red.score > match.alliances.blue.score ? "red" : "blue";

            return match;
        }

        genMatchSchedule(teamCount, matchesPerTeam)
        {
            let matchCount = Math.ceil(teamCount * matchesPerTeam / 6);
            let matches = [];
            for (let i = 0; i < matchCount; i++) {
                matches.push({'red': [], 'blue': []});
            }

            let teams = this.genTeams(teamCount);
            for (let i = 0; i < teamCount; i++) {
                for (let j = 0; j < matchesPerTeam; j++) {
                    let pos = this.rnd(matchCount - 1);
                    let iters = 0;
                    while (iters < 1000 &&
                          (matches[pos].red.includes(teams[i]) ||
                           matches[pos].blue.includes(teams[i]) ||
                           (matches[pos].red.length >= 3 &&
                            matches[pos].blue.length >= 3))) {
                        pos = this.rnd(matchCount - 1);
                        iters++;
                    }
                    if (iters < 1000) {
                        let color = this.rnd(0,1);
                        if (matches[pos][color == 0 ? 'red' : 'blue'].length >= 3)
                            color = 1 - color;
                        matches[pos][color == 0 ? 'red' : 'blue'].push(teams[i]);
                    }
                }
            }
            for (let i = 0; i < matchCount; i++) {
                while (matches[i].red.length < 3) {
                    matches[i].red.push('frc0');
                }
                while (matches[i].blue.length < 3) {
                    matches[i].blue.push('frc0');
                }
            }
            return matches;
        }

        genTeams(count)
        {
            let teams = [];
            for (let i = 0; i < count; i++) {
                teams.push('frc' + this.rnd(10000));
            }
            return teams.filter(function(item, pos) {
                return teams.indexOf(item) == pos;
            });
        }

        rnd(high)
        {
            return Math.floor(Math.random() * (high + 1));
        }

        endgameToPoints(endgame)
        {
            return endgame == "Traversal" ? 15 :
                  (endgame == "High" ? 10 :
                  (endgame == "Mid" ? 6 :
                  (endgame == "Low" ? 4 : 0)));
        }

        fillScoreBreakdown(breakdown)
        {
            let arrTaxi = ["Yes", "No"];
            let arrEndgame = ["Traversal", "High", "Mid", "Low", "None"];

            breakdown.taxiRobot1 = arrTaxi[this.rnd(1)];
            breakdown.taxiRobot2 = arrTaxi[this.rnd(1)];
            breakdown.taxiRobot3 = arrTaxi[this.rnd(1)];
            breakdown.autoTaxiPoints = (breakdown.taxiRobot1 == "Yes" ? 2 : 0) +
                                       (breakdown.taxiRobot2 == "Yes" ? 2 : 0) +
                                       (breakdown.taxiRobot3 == "Yes" ? 2 : 0);

            breakdown.endgameRobot1 = arrEndgame[this.rnd(4)];
            breakdown.endgameRobot2 = arrEndgame[this.rnd(4)];
            breakdown.endgameRobot3 = arrEndgame[this.rnd(4)];
            breakdown.endgamePoints = this.endgameToPoints(breakdown.endgameRobot1) +
                                      this.endgameToPoints(breakdown.endgameRobot2) +
                                      this.endgameToPoints(breakdown.endgameRobot3);

            breakdown.autoCargoLowerNear = this.rnd(1);
            breakdown.autoCargoLowerFar = this.rnd(1);
            breakdown.autoCargoLowerBlue = this.rnd(1);
            breakdown.autoCargoLowerRed = this.rnd(1);

            breakdown.autoCargoUpperNear = this.rnd(1);
            breakdown.autoCargoUpperFar = this.rnd(1);
            breakdown.autoCargoUpperBlue = this.rnd(1);
            breakdown.autoCargoUpperRed = this.rnd(1);

            breakdown.autoCargoTotal = breakdown.autoCargoLowerNear +
                                       breakdown.autoCargoLowerFar +
                                       breakdown.autoCargoLowerBlue +
                                       breakdown.autoCargoLowerRed +
                                       breakdown.autoCargoUpperNear +
                                       breakdown.autoCargoUpperFar +
                                       breakdown.autoCargoUpperBlue +
                                       breakdown.autoCargoUpperRed;
            breakdown.autoCargoPoints = breakdown.autoCargoLowerNear * 2 +
                                       breakdown.autoCargoLowerFar * 2 +
                                       breakdown.autoCargoLowerBlue * 2 +
                                       breakdown.autoCargoLowerRed * 2 +
                                       breakdown.autoCargoUpperNear * 4 +
                                       breakdown.autoCargoUpperFar * 4 +
                                       breakdown.autoCargoUpperBlue * 4 +
                                       breakdown.autoCargoUpperRed * 4;
            breakdown.autoPoints = breakdown.autoCargoPoints + breakdown.autoTaxiPoints;
            breakdown.quintetAchieved = breakdown.autoCargoTotal >= 5;

            breakdown.teleopCargoLowerNear = this.rnd(3);
            breakdown.teleopCargoLowerFar = this.rnd(3);
            breakdown.teleopCargoLowerBlue = this.rnd(3);
            breakdown.teleopCargoLowerRed = this.rnd(3);

            breakdown.teleopCargoUpperNear = this.rnd(3);
            breakdown.teleopCargoUpperFar = this.rnd(3);
            breakdown.teleopCargoUpperBlue = this.rnd(3);
            breakdown.teleopCargoUpperRed = this.rnd(3);

            breakdown.teleopCargoTotal = breakdown.teleopCargoLowerNear +
                                       breakdown.teleopCargoLowerFar +
                                       breakdown.teleopCargoLowerBlue +
                                       breakdown.teleopCargoLowerRed +
                                       breakdown.teleopCargoUpperNear +
                                       breakdown.teleopCargoUpperFar +
                                       breakdown.teleopCargoUpperBlue +
                                       breakdown.teleopCargoUpperRed;
            breakdown.teleopCargoTotal = breakdown.teleopCargoLowerNear +
                                       breakdown.teleopCargoLowerFar +
                                       breakdown.teleopCargoLowerBlue +
                                       breakdown.teleopCargoLowerRed +
                                       breakdown.teleopCargoUpperNear * 2 +
                                       breakdown.teleopCargoUpperFar * 2 +
                                       breakdown.teleopCargoUpperBlue * 2 +
                                       breakdown.teleopCargoUpperRed * 2;

            breakdown.teleopCargoPoints = breakdown.teleopCargoTotal + breakdown.autoCargoTotal;
            breakdown.teleopPoints = breakdown.teleopCargoPoints;

            breakdown.techFoulCount = this.rnd(1);
            breakdown.foulCount = this.rnd(2);
            breakdown.adjustPoints = 0;
            breakdown.foulPoints = breakdown.techFoulCount * 15 + breakdown.foulCount * 3;

            breakdown.totalPoints = breakdown.autoPoints + breakdown.teleopPoints + breakdown.endgamePoints;
            breakdown.cargoBonusRankingPoint = breakdown.quintetAchieved ?
                                             ((breakdown.teleopCargoTotal + breakdown.autoCargoTotal) > 18) :
                                             ((breakdown.teleopCargoTotal + breakdown.autoCargoTotal) > 20);
            breakdown.hangarBonusRankingPoint = breakdown.endgamePoints >= 16;

            breakdown.rp = (breakdown.cargoBonusRankingPoint ? 1 : 0) + (breakdown.hangarBonusRankingPoint ? 1 : 0);
        }

    };

    if ( typeof exports !== 'undefined' ) {
        if ( typeof module !== 'undefined' && module.exports ) {
            exports = module.exports = TBA_Generator;
        }
        exports.TBA_Generator = TBA_Generator;
    } else {
        root.TBA_Generator = TBA_Generator;
    }

}).call(this);
