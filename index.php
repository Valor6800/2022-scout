<!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>ViperScout</title>

    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Open+Sans:400italic,400,600italic,600,700italic,700,800italic,800">
    <link rel="stylesheet" type="text/css" href="./styles.css">
    <script type="text/javascript" src="dist/sorttable.js"></script>
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-133390567-1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'UA-133390567-1');
    </script>
  </head>

  <body class="w3-padding-64">

      <div class="w3-top w3-bar w3-black w3-hide-small">
        <a href="index.html" class="w3-bar-item w3-button" id="home_button">ViperScout</a>
        <a href="all.html" class="w3-bar-item w3-button">All regionals/districts</a>
        <a href="prediction.html" class="w3-bar-item w3-button">Match Prediction</a>
        <a href="#" class="w3-bar-item w3-button w3-mobile w3-right viper-black-hover" id="questions_button">
          <i class="fa fa-question-circle" alt="Questions?"></i>
        </a>
      </div>

    <!-- Navbar on small screens (Hidden on medium and large screens) -->
    <div class="w3-top w3-light-grey w3-hide-large w3-hide-medium" id="myNavbar">
      <div class="w3-bar w3-center w3-large">
        <a href="index.html" class="w3-bar-item w3-button w3-grey" style="width:25% !important" id="home_button"><i class="fa fa-home" alt="Home"></i></a>
        <a href="all.html" class="w3-bar-item w3-button w3-light-grey" style="width:25% !important">All</a>
        <a href="prediction.html" class="w3-bar-item w3-button w3-light-grey" style="width:25% !important">Predict</a>
      </div>
    </div>

    <!-- Page Content -->
    <div class="w3-padding-large" id="main">
      
      <!-- Questions pop-up -->
      <div id="questions_alert" class="w3-justify w3-panel grey-no-hover w3-display-container w3-animate-opacity">
        <span id="getStartedClose" class="w3-button w3-xlarge red-hover w3-display-topright">&times;</span>
        <h3>Getting Started</h3>
        <p>Use the search-bar below and start typing a name, location, or code for a regional or district event.
        After finding your event, click the row to open up the stats page</p>
        <p>OPR on this site is generated by summing up all columns EXCEPT penalties. OPRP is OPR with penalties subtracted,
        which is an attempt to penalize teams that are committing lots of fouls.</p>
        <p>The OPR you see here WILL be different from thebluealliance.com as TBA only uses final scores for its' OPR calculations,
        which has penalties baked in</p>
      </div>

      <!-- Container for the regional list -->
      <div class="w3-justify w3-text-white" id="regional_list">

        <!-- Search box -->
        <input class="w3-input w3-border w3-padding search-box" type="text" placeholder="Search regional name, code, location" id="filter_box" onkeyup="filter_results()">

        <!-- Item table -->
          <table class="sortable w3-card w3-table w3-striped w3-hoverable w3-margin-top" id="regional_table">
            <!--Generated items will go here-->
          </table>
      </div>

      <!-- Container for the item content viewer -->
      <div class="w3-justify w3-card w3-white" id="regional_details" style="display: none;">
        <header class="w3-container viper-black-no-hover">
          <h3><span id="regional_detail_name"></span></h3>
        </header>

        <!-- OPR table -->
        <table class="sortable w3-card w3-table w3-striped w3-hoverable" id="opr_table">
        <!--Generated items will go here-->
        </table>

        <div id="opr_error">
        </div>

      </div>

    <!-- END PAGE CONTENT -->
    </div>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/js-cookie@2/src/js.cookie.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/5.6.0/math.js"></script>
    <script type="text/javascript" src="dist/scripts.js"></script>
    <script src="./dist/bundle.js"></script>
  </body>

<script id="reg-header-table" type="text/template">
    <thead class="viper-grey">
        <th>Name</th>
        <th>Location</th>
        <th>Code</th>
    </thead>
</script>

<script id="reg-template-table-entry" type="text/template">
    <tr class="table_entry" id="{{name}}">
      <td class="table_entry_name" id="{{name}}">{{name}}</td>
      <td class="table_entry_location" id="{{location}}">{{location}}</td>
      <td class="table_entry_code" id="{{code}}">{{code}}</td>
    </tr>
</script>

<script id="opr-header-table" type="text/template">
    <thead class="viper-grey">
        <td>Team</td>
        <td>OPR</td>
        <td>OPRP</td>
        <td>Auto Line</td>
        <td>Climb</td>
        <td>Rung Level?</td>
        <td>Auto Cells</td>
        <td>Auto Inner</td>
        <td>Auto Outer</td>
        <td>Auto Bottom</td>
        <td>Teleop Cells</td>
        <td>Teleop Inner</td>
        <td>Teleop Outer</td>
        <td>Teleop Bottom</td>
        <td>Control Panel</td>
        <td>Penalty</td>
    </thead>
</script>

<script id="opr-template-table-entry" type="text/template">
    <tr class="table_entry" >
        <td><a href="{{url}}">{{team}}</a></td>
        <td>{{opr}}</td>
        <td>{{oprp}}</td>
        <td>{{move}}</td>
        <td>{{climb}}</td>
        <td>{{rung_level}}</td>
        <td>{{auto}}</td>
        <td>{{autoCellsInner}}</td>
        <td>{{autoCellsOuter}}</td>
        <td>{{autoCellsBottom}}</td>
        <td>{{teleop}}</td>
        <td>{{teleopCellsInner}}</td>
        <td>{{teleopCellsOuter}}</td>
        <td>{{teleopCellsBottom}}</td>
        <td>{{panel}}</td>
        <td>{{penalty}}</td>
    </tr>
</script>

<script>
    
    $('#getStartedClose').on('click', function() {
        $('#questions_alert').hide();
        Cookies.set('getStartedClose', true, { expires: 365 });
    });

    $('#home_button').on('click', function() {
      $('#regional_details').hide();
      $('#regional_list').show();
    });
    
    $('#questions_button').on('click', function() {
      $("#questions_alert").show();
    });
    var tba = new TBA();

    tba.getEvents(function(results) {

        // Cache of the template
        var regHeader = document.getElementById("reg-header-table");
        var regTemplate = document.getElementById("reg-template-table-entry");
        // Get the contents of the template
        var regionalHeaderHtml = regHeader.innerHTML;
        var regionalTemplateHtml = regTemplate.innerHTML;
        // Final HTML variable as empty string
        var listHtml = regionalHeaderHtml;

        // Loop through dataObject, replace placeholder tags
        // with actual data, and generate final HTML
        for (var regional in results) {
          listHtml += regionalTemplateHtml.replace(/{{name}}/g, results[regional].name)
                                  .replace(/{{location}}/g, results[regional].city + ', ' + results[regional].state_prov + ', ' + results[regional].country)
                                  .replace(/{{code}}/g, results[regional].key);
        }

        // Replace the HTML of #list with final HTML
        document.getElementById("regional_table").innerHTML = listHtml;

        $('#regional_table tr').not(':first').each(function(index, element) {
            $(element).on('click', function() {
                var name = $(element).find('.table_entry_name').attr('id');
                var key = $(element).find('.table_entry_code').attr('id');
                $('#regional_detail_name').html(name);
                // ga('send', 'event', 'scout', key);

                tba.genOPRs(key, function(results) {

                    // Cache of the template
                    var OPRheader = document.getElementById("opr-header-table");
                    var OPRtemplate = document.getElementById("opr-template-table-entry");
                    // Get the contents of the template
                    var OPRHeaderHtml = OPRheader.innerHTML;
                    var OPRTemplateHtml = OPRtemplate.innerHTML;

                    if (results) {
                        // Final HTML variable as empty string
                        var listHtml = OPRHeaderHtml;

                        // Loop through dataObject, replace placeholder tags
                        // with actual data, and generate final HTML
                        for (var team in results) {
                            listHtml += OPRTemplateHtml.replace(/{{url}}/g, "https://www.thebluealliance.com/team/" + team)
                                                  .replace(/{{team}}/g, team)
                                                  .replace(/{{opr}}/g, results[team].opr.toFixed(2))
                                                  .replace(/{{oprp}}/g, results[team].oprp.toFixed(2))
                                                  .replace(/{{move}}/g, results[team].move.toFixed(2))
                                                  .replace(/{{climb}}/g, results[team].climb.toFixed(2))
                                                  .replace(/{{rung_level}}/g, results[team].rung_level.toFixed(2))
                                                  .replace(/{{auto}}/g, (results[team].autoCellsInner + results[team].autoCellsOuter + results[team].autoCellsBottom).toFixed(2))
                                                  .replace(/{{autoCellsInner}}/g, results[team].autoCellsInner.toFixed(2))
                                                  .replace(/{{autoCellsOuter}}/g, results[team].autoCellsOuter.toFixed(2))
                                                  .replace(/{{autoCellsBottom}}/g, results[team].autoCellsBottom.toFixed(2))
                                                  .replace(/{{teleop}}/g, (results[team].teleopCellsInner + results[team].teleopCellsOuter + results[team].teleopCellsBottom).toFixed(2))
                                                  .replace(/{{teleopCellsInner}}/g, results[team].teleopCellsInner.toFixed(2))
                                                  .replace(/{{teleopCellsOuter}}/g, results[team].teleopCellsOuter.toFixed(2))
                                                  .replace(/{{teleopCellsBottom}}/g, results[team].teleopCellsBottom.toFixed(2))
                                                  .replace(/{{panel}}/g, results[team].panel.toFixed(2))
                                                  .replace(/{{penalty}}/g, results[team].penalty.toFixed(2))
                        }

                        // Replace the HTML of #list with final HTML
                        document.getElementById("opr_table").innerHTML = listHtml;
                        sorttable.makeSortable(document.getElementById("opr_table"));
                    } else {
                        document.getElementById("opr_error").innerHTML = "No data found for this regional/district yet!";
                    }
                });
                $('#regional_list').hide();
                $('#regional_details').show();
            });
        });
    });
</script>

</html>