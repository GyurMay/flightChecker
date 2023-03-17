
const request = require('request');
const https = require('http');

const server = https.createServer(listen_handler);

function listen_handler(req, res){

  // Create a JSON object with the message
  var url = require('url');
  var url_parts = url.parse(req.url, true);
  var maxDays = url_parts.query.maxDays;
  let fromMin = url_parts.query.fromMin;
  let weeks = url_parts.query.weeks !== undefined ? url_parts.query.weeks : 1;
  if(fromMin !== undefined){
  // console.log(url_parts ,maxDays, " :maxDays found")
    getFlightRates(weeks, res, maxDays, fromMin);
  }else{
    getFlightRates(weeks, res, maxDays);
  }

}
server.listen(3000);


// fromMax = fromMin; //fixed go Date

let priceArrGlobal = [], rateArrGlobal = [], cheapestRates = [];

const getFlightRates = (weeks, res, maxDays = 70, fromMin = '2023-07-01', selectedDate = '2023-06-29', dest = 'KTM') => {
// console.log(res);
// return;

  let fromMax = JSON.stringify(new Date((new Date(fromMin)).getTime() + 24*7*60*60*1000)).substring(1,11);
  let toMax = JSON.stringify(new Date((new Date(fromMin)).getTime() + 24*(maxDays)*60*60*1000)).substring(1,11);
  let toMin = JSON.stringify(new Date((new Date(fromMin)).getTime() + 24*(maxDays - 14)*60*60*1000)).substring(1,11); //14 days from max duration to stay

  selectedDate = fromMin;

  let jfkToKtmBody = `[null,"[null,[null,null,1,null,[],1,[1,0,0,0],null,null,null,null,null,null,[[[[[\\"/m/02_286\\",4]]],[[[\\"${dest}\\",0]]],null,0,[],[],\\"${selectedDate}\\",null,[],[],[],null,null,[],3],[[[[\\"${dest}\\",0]]],[[[\\"/m/02_286\\",4]]],null,0,[],[],\\"2023-07-29\\",null,[],[],[],null,null,[],3]],null,null,null,true,null,null,null,null,null,[],null,null,null],[\\"${fromMin}\\",\\"${fromMax}\\"],[\\"${toMin}\\",\\"${toMax}\\"]]"]&at=ADrsKaGvGdj45shP2ktHAZ4ZWSiC:${(new Date()).getTime()}&`;
  jfkToKtmBody = 'f.req='+encodeURIComponent(jfkToKtmBody);
  const options = {
    url: 'https://www.google.com/_/TravelFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarGrid?f.sid=-6525567352185781116&bl=boq_travel-frontend-ui_20230308.01_p1&hl=en-GB&soc-app=162&soc-platform=1&soc-device=1&_reqid=879599&rt=c',
    "credentials": "include",
      "headers": {    
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      "body": jfkToKtmBody,
      "method": "POST",
      "mode": "cors"
  };
  request.post(options, (error, response, body) => {
    // console.log(body);
    // return;
    if (error) {
      console.error(error);
    } else {
      if(body.includes("ErrorResponse")){
        console.log("error response", body);
        return;
      }
      let resp = body.split('\n');
      let temp = [];
      for(let i = 3;i<resp.length - 2*2; i+=2){ //first 2 are useless elements, last 2 signify end of the request (also useless) 
        temp.push(resp[i] !== undefined ? resp[i] : [null,null,'undefined']);
      }
      resp = temp;
      let priceArr = [], rateArr = [];

      let c=0; //counter for debugging purposes
      resp.forEach(resp => {
        

        // console.log(`------------------doing ${resp}---------------------- at ${c++}\n`)

        let j  = JSON.parse(resp);
        let rateArr1 = JSON.parse(j[0][2])[1];
        if(rateArr1 !== undefined){
          rateArr.push(rateArr1);
          
          rateArr1.forEach(x => priceArr.push(x[2][0][1]));
        }
      });
      // console.log(rateArr.flat(),rateArr[0], rateArr[0][1], rateArr[0][2])
      priceArr.sort();
      let minFlightInx = -1;
      for(let i=0;i<priceArr.length && minFlightInx === -1;i++){
        minFlightInx = rateArr.findIndex(x => x[0][2][0][1] === priceArr[i] && 
          (((new Date(x[0][1]))-(new Date(x[0][0])))/1000/60/60/24 < maxDays));
        // console.log(rateArr[minFlightInx][0][2][0][1], priceArr[i], ((new Date(rateArr[minFlightInx][0][1]))-(new Date(rateArr[minFlightInx][0][0])))/1000/60/60/24, minFlightInx)
        console.log(rateArr[i][0][2][0][1], (((new Date(rateArr[i][0][1]))-(new Date(rateArr[i][0][0])))/1000/60/60/24));
      }
      // console.log(Math.min(...priceArr), priceArr.sort(), rateArr, minFlightInx, rateArr[minFlightInx][0][0]);
      console.log(rateArr)
      priceArrGlobal.push(...priceArr);
      rateArrGlobal.push(rateArr);

      if(minFlightInx !== -1){
        let duration = ((new Date(rateArr[minFlightInx][0][1]))-(new Date(rateArr[minFlightInx][0][0])))/1000/60/60/24;
        finalStr = `\n\nfor ${fromMin} week, \nCheapest price: $${rateArr[minFlightInx][0][2][0][1]}, for date: ${rateArr[minFlightInx][0][0]} -> ${rateArr[minFlightInx][0][1]} for the duration of ${duration} days\n\n`;
        console.log(finalStr);
      }else{
        finalStr = 'No such flights';
      }

      cheapestRates.push(finalStr); 
      
      if(weeks !== 1 && minFlightInx !== -1){
        let newFromMin = fromMax;
        // newFromMax = JSON.stringify(new Date((new Date(newFromMin)).getTime() + 24*7*60*60*1000)).substring(1,11);
        console.log("fetching next week", newFromMin);
        getFlightRates(--weeks, res, maxDays, newFromMin);
      }
      console.log(cheapestRates);

      res.writeHead(200, {'Content-Type': 'application/json'});
      temp = [];
      cheapestRates.forEach(x => {
        temp.push({"text":x});
      })
      cheapestRates = temp;
      const message = { messages: cheapestRates };

      // Convert the object to a JSON string
      const responseBody = JSON.stringify(message);
      res.end(responseBody);
      priceArrGlobal = [], rateArrGlobal = [], cheapestRates = [];
      return;
    }
  });
};

// getFlightRates(1);
// getFlightRates('date','2023-07-08','2023-07-13')