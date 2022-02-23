# Valor Scout

Valor scout is a personal project to dynamically calculate component OPRs and give match predictions. I created this 2 years ago for the 2020 season and kept it running through 2021.

## Usage

### HTML CDN

To use this code over CDN, add the following lines within your `<head></head>` tags in your HTML document:

```
<script src="https://scout.valor6800.com/dist/min.tba.js">
<script src="https://scout.valor6800.com/dist/min.tba_generator.js">
```

At that point, within any scripts for that HTML page, you can use the classes as follows:

```
var tba = new TBA();
var tba_gen = new TBA_Generator();
```

### Server side nodejs

To use this code via nodejs, go to the following links and save to your local directory:

* <a href="https://scout.valor6800.com/src/tba.js" download>TBA</a>
* <a href="https://scout.valor6800.com/src/tba_generator.js" download>TBA_Generator</a>

At that point, within any nodejs code, you can use the classes as follows:

```
var TBA = require('./src/tba.js');
var tba = new TBA();

var TBA_Generator = require('./src/tba_generator.js');
var gen = new TBA_Generator();
```

## What is new in 2022
If you have used this site in the past, this section is for you. If you haven’t, please read all of the sections to understand component OPRs and the way I have setup match predictions.

### 2022 Data elements
The following are the columns that are being tracked on the site:

* OPR - Offensive Power Rating
* OPRP - Offensive Power Rating minus the penalty column
	* See penalty section for what positive and negatives mean
* Taxi - Moving bonus during auto
* Climb - Hanging points during endgame
* Auto Cargo - count of upper and lower cargo during auto
	* Auto Cargo Upper - count of upper cargo during auto
	* Auto Cargo Lower - count of lower cargo during auto
* Teleop Cargo - count of upper and lower cargo during teleop
	* Teleop Cargo Upper - count of upper cargo during teleop
	* Teleop Cargo Lower - count of lower cargo during teleop
* Penalty
	* NEGATIVE penalties means that team draws penalties during a match, and gets ADDED to the OPR
	* POSITIVE penalties mean teams commit penalties and get SUBTRACTED from their OPR

### 2022 Prediction Tab
Notes for this tab:

* The red and blue buttons swap tabs. I plan on updating the UI to make this clearer in the future
* Anytime something says “Cargo”, it means a count of cargos scored.
* Anytime something says “Pts”, it means the point value of said item, not a count. Ex. Auto Pts takes into consideration its cargo count multiplied by 4 for the upper hub

## Background
I have been doing OPR calculations since 2010 when it was just becoming big. (12 years ago… Where did the time go?) I created an Android app in 2013 using a crappy knock-off Android phone, and 2G service, to dynamically calculate OPRs on the fly and predict match outcomes. Keep in mind, most OPR numbers at the time were posted by Ed Law, Ether, and 1114 on Sunday night in CSV files. TBA didn’t calculate OPR until MUCH later.

Now, 10 years later, everyone seems to have OPR calculators and it is instantly available on TBA. New metrics are available, and “generalized” scouting apps are a thing.

So why do I still keep doing this?

* I enjoy coding and I learned to code via OPR calculations. Wouldn’t be here today without it
* I learn what data needs to be collected to properly assess a match
* I learn what I need going into a match, and can ask my scout lead for the right data elements

Lastly, I want to clarify that me personally and 6800 does not use OPR as the sole metric for scouting and selection. It is just another datapoint, another reference, that we can use when assessing matches. Use whatever data points you feel add to your existing scouting report

## Component OPR
The normal OPR equations take the match schedule and the final scores to generate OPRs:

Ax=B - where A is the matrix representing who played who, and B is the matrix representing the sums of the match scores each team has played in.

What this doesn’t capture is penalties, or how those points are broken up. By swapping out the B matrix with different sums, we can capture component OPRs.

Examples:

* Auto low cargo
* Penalties
* Teleop Inner cargo

TBA (thebluealliance.com ) simplified this a few years ago by adding game element counts to their post-match breakdowns. Now, we can obtain how many auto low cells were scored in each match, and use this to calculate the B matrix - therefore allowing us to make a component OPR for auto low cells.

On top of just calculating component OPRs, we can also improve our overall OPR calculation. Instead of using the score of the match in our B matrix for overall OPR, we can add up the component OPRs of each team to obtain an OPR that doesn’t include penalties.

Heck, you can even subtract penalties from OPRs now using this method. TBA reports a robot-by-robot breakdown of climbs and auto starts. Therefore you can swap out the component OPRs for climbing and auto starts with real datapoints and averages instead of estimates. Now your OPR is even more accurate! Tons of cool stuff you can do

## Match Predictions
Using component OPRs, you can look at a future match and see a picture of what that alliance could be doing. Again, don’t substitute this for your own scouting data - use it to enhance it.

I can use the component OPRs to give me a quick look at who scores more in auto, inner vs outer port, who scores more in teleop, etc.

## Questions?
Let me know if you have any questions. Site should be live all season.

## Discussion
https://www.chiefdelphi.com/t/2022-component-opr-and-match-prediction-site-valor-scout/403386/1