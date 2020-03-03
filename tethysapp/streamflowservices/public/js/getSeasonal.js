//**GLOBAL VARIABLES TO DEAL WITH THE FUNCTIONS**//
var dates = {highres: [], dates: []};
var values = {highres: [], max: [], mean: [], min: [], std_dev_range_lower: [], std_dev_range_upper: []};
var returnShapes;
var endpoint="https://tethys2.byu.edu/localsptapi/api/";

//*********SEASONAL AVERAGE FUNCTION TAB*******////
function graph_s(reachid,htmlELement,add,width,height) {
  width = (typeof width !== 'undefined') ?  width : 500;
  height = (typeof heigth !== 'undefined') ?  heigth : 500;
  add = (typeof width !== 'undefined') ?  width : false;
  console.log('WE HAVE ENTERED GET_SEASONAL_AVERAGE FUNCTION()');
  var layer_URL=endpoint+"SeasonalAverage/?reach_id="+reachid+"&return_format=csv";
  $.ajax({
    type:'GET',
    url: layer_URL,
    dataType: 'text',
    contentType:'text/plain',
    success: function(data) {

      var allLines = data.split('\n');
      var headers = allLines[0].split(',');

      for (var i=1; i < allLines.length; i++) {
        var data = allLines[i].split(',');
        dates.dates.push(data[0]);
        values.mean.push(data[1]);
      }
    },
      complete: function() {
          console.log("complete part of the ajax call for getSeasonalAverage");
          var mean = {
              name: 'Mean',
              x: dates.dates,
              y: values.mean,
              mode: "lines",
              line: {color: 'blue'}
          };
          var data = [mean];

          var layout = {
              // title: 'Historical Streamflow<br>'+titleCase(watershed) + ' Reach ID:' + comid,
              title: 'Seasonal Average StreamFlow<br>'+' Reach ID:' + reachid,
              xaxis: {title: 'Date'},
              yaxis: {title: 'Streamflow m3/s', range: [0, Math.max(...data[0].y) + Math.max(...data[0].y)/5]},
              // plot_bgcolor:"#7782c5",

              //shapes: returnShapes,
          }
          //Removing any exisisting element with the same name//
          var divELement=document.getElementById("graph");
          if(divELement != null && add==false){
            Plotly.purge(divELement);
            divELement.remove();
          };

          divELement=document.createElement('div');
          divELement.setAttribute("id", "graph");
          divELementParent= document.getElementById(htmlELement);
          divELementParent.append(divELement);

          Plotly.newPlot('graph', data, layout);

          var index = data[0].x.length-1;

          // for(var i=0; i<data[0].y.length;++i){
          //   console.log(i);
          //   console.log(data[0].y[i]);
          //
          // };
          returnPeriods.graph_rp(reachid, data[0].x[0], data[0].x[index],width,height);

          // getreturnperiods(reachid, data[0].x[0], data[0].x[index],width,height);

          dates.highres = [], dates.dates = [];
          values.highres = [], values.max = [], values.mean = [], values.min = [], values.std_dev_range_lower = [], values.std_dev_range_upper = [];
      }//add lines to plotly

    });
  };
function downloadSeasonalData(reachid){
    console.log("enter the download function");
    // THIS IS A FUNCTION TO DOWNLOAD DATA //
    var downloadUrl=endpoint+"SeasonalAverage/?reach_id="+reachid+"&return_format=csv";
    // var downloadUrl="https://tethys2.byu.edu/localsptapi/api/"+"ForecastEnsembles/?reach_id="+reachid+"&return_format=csv";
    var req = new XMLHttpRequest();
    req.open("GET", downloadUrl, true);
    req.responseType = "blob";
    // if the API requires the headers///
    // req.setRequestHeader('my-custom-header', 'custom-value'); // adding some headers (if needed)

    req.onload = function (event) {
      console.log("onload");
      var blob = req.response;
      var fileName = reachid;
      var contentType = req.getResponseHeader("content-type");

      //IE/EDGE seems not returning some response header
      if (req.getResponseHeader("content-disposition")) {
        console.log("enter first if");
        var contentDisposition = req.getResponseHeader("content-disposition");
        fileName = contentDisposition.substring(contentDisposition.indexOf("=")+1);
      }
      else {
        console.log("enter first else");
        fileName = reachid + " Seasonal." + contentType.substring(contentType.indexOf("/")+1);
      }

      if (window.navigator.msSaveOrOpenBlob) {
        // Internet Explorer
        console.log("enter second if ");
        window.navigator.msSaveOrOpenBlob(new Blob([blob], {type: contentType}), fileName);
      }
      else {
        console.log("enter second else");
        var el = document.createElement("a");
        el.id="target";
        // var el = document.getElementById("target");
        el.href = window.URL.createObjectURL(blob);
        el.download = fileName;
        el.click();
        window.URL.revokeObjectURL(el.href);
      }
    };
    req.send();
  };
function locationGraph_s (lat,lon,htmlELement,add, width,height){
    width = (typeof width !== 'undefined') ?  width : 500;
    height = (typeof heigth !== 'undefined') ?  heigth : 500;
    add = (typeof width !== 'undefined') ?  width : false;

    var layer_URL1=endpoint +"GetReachID/?lat="+lat+"&long="+lon;
    $.ajax({
      type: 'GET',
      url: layer_URL1,
      success: function(data) {
        var dataText=JSON.stringify(data);
        var reachid=dataText['reach_id'];
        var layer_URL=endpoint+"SeasonalAverage/?reach_id="+reachid+"&return_format=csv";
        $.ajax({
          type:'GET',
          url: layer_URL,
          dataType: 'text',
          contentType:'text/plain',
          success: function(data) {

            var allLines = data.split('\n');
            var headers = allLines[0].split(',');

            for (var i=1; i < allLines.length; i++) {
              var data = allLines[i].split(',');
              dates.dates.push(data[0]);
              values.mean.push(data[1]);
            }
          },
            complete: function() {
                console.log("complete part of the ajax call for getSeasonalAverage");
                var mean = {
                    name: 'Mean',
                    x: dates.dates,
                    y: values.mean,
                    mode: "lines",
                    line: {color: 'blue'}
                };
                var data = [mean];

                var layout = {
                    // title: 'Historical Streamflow<br>'+titleCase(watershed) + ' Reach ID:' + comid,
                    title: 'Seasonal Average StreamFlow<br>'+' Reach ID:' + reachid,
                    xaxis: {title: 'Date'},
                    yaxis: {title: 'Streamflow m3/s', range: [0, Math.max(...data[0].y) + Math.max(...data[0].y)/5]},
                    // plot_bgcolor:"#7782c5",

                    //shapes: returnShapes,
                }
                //Removing any exisisting element with the same name//
                var divELement=document.getElementById("graph");
                if(divELement != null && add==false){
                  Plotly.purge(divELement);
                  divELement.remove();
                };

                divELement=document.createElement('div');
                divELement.setAttribute("id", "graph");
                divELementParent= document.getElementById(htmlELement);
                divELementParent.append(divELement);

                Plotly.newPlot('graph', data, layout);

                var index = data[0].x.length-1;

                // for(var i=0; i<data[0].y.length;++i){
                //   console.log(i);
                //   console.log(data[0].y[i]);
                //
                // };
                returnPeriods.graph_rp(reachid, data[0].x[0], data[0].x[index],width,height);

                // getreturnperiods(reachid, data[0].x[0], data[0].x[index],width,height);

                dates.highres = [], dates.dates = [];
                values.highres = [], values.max = [], values.mean = [], values.min = [], values.std_dev_range_lower = [], values.std_dev_range_upper = [];
            }//add lines to plotly

          });
        }
    });
  };
