/**This Module only exports a graph containing historical data,
it can be added with more functions if neeeded, porobably something great
will be to have the coordinates of lat long available to makeable to plot a graph.
**/

//**GLOBAL VARIABLES TO DEAL WITH THE FUNCTIONS**//
var dates = {highres: [], dates: []};
var values = {highres: [], max: [], mean: [], min: [], std_dev_range_lower: [], std_dev_range_upper: []};
var returnShapes;
var endpoint="https://tethys2.byu.edu/localsptapi/api/"


//RETURNS THE RETURN PERIODS IN A GRAPH//
function graph_rp (reachid,start, end, width, height) {
 // var layer_URL="https://tethys2.byu.edu/localsptapi/api/ReturnPeriods/?reach_id="+reachid+"&return_format=csv";
 var layer_URL=endpoint+"ReturnPeriods/?reach_id="+reachid+"&return_format=csv";
 console.log("inside getreturnperiods");
   $.ajax({
     type:'GET',
     assync: true,
     url: layer_URL,
     dataType: 'text',
     contentType:'text/plain',
     success: function (data) {
       console.log("printing data");
       console.log(typeof(data));
       // console.log(data);
       // var returnPeriods = JSON.parse(data);
       var returnPeriods=[];
       var toSplitNewLine= data.split("\n");
       for(var i= 0; i< toSplitNewLine.length-1; i++){
         var toSplit= toSplitNewLine[i].split(",");

         returnPeriods.push({
           time_series: toSplit[0],
           val: toSplit[1]
         });
         // json.push({toSplit[0]:toSplit[1]});

       }
       // console.log(returnPeriods);
       // console.log(returnPeriods);

       //RETURN PERIOD MAX
       var return_max = parseFloat(returnPeriods[1].val);
       console.log("printing Max");
       console.log(return_max);

       //RETURN PERIOD 20
       var return_20 = parseFloat(returnPeriods[2].val);
       console.log("printing return_20");
       console.log(return_20);

       //RETURN PERIOD 10
       var return_10 = parseFloat(returnPeriods[3].val);
       console.log("printing return10");
       console.log(return_10);

       //RETURN PERIOD 2
       var return_2 = parseFloat(returnPeriods[4].val);
       console.log("printing return2");
       console.log(return_2);
       var band_alt_max = -9999

       var shapes = [
               //return 20 band
               {
                 type: 'rect',
                 layer: 'below',
                 xref: 'x',
                 yref: 'y',
                 x0: start,
                 y0: return_20,
                 x1: end,
                 y1: Math.max(return_max, band_alt_max),
                 line: {width: 1},
                 fillcolor: 'rgba(128, 0, 128, 0.4)'
               },
               // return 10 band
               {
                   type: 'rect',
                   layer: 'below',
                   xref: 'x',
                   yref: 'y',
                   x0: start,
                   y0: return_10,
                   x1: end,
                   y1: return_20,
                   line: {width: 1},
                   fillcolor: 'rgba(255, 0, 0, 0.4)'
               },
               // return 2 band
               {
                   type: 'rect',
                   layer: 'below',
                   xref: 'x',
                   yref: 'y',
                   x0: start,
                   y0: return_2,
                   x1: end,
                   y1: return_10,
                   line: {width:1},
                   fillcolor: 'rgba(255, 255, 0, 0.4)'
               }];
         // passShape(shapes, width, height);
         var update = {
             shapes: shapes,
         };
         Plotly.relayout('graph', update);
       }
   })
 }
