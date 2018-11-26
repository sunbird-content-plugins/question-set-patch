var request = require("request");
var _ = require('lodash');
var https = require('https');
var fs = require('fs');
var env_url = "https://http://diksha.gov.in/action/content/v3/bundle";
var download = require('download-file');

var contentIds = [
    "do_2126045952302284801765",
    "do_21260518660307353611396",
    "do_21260729539003187211583",
    "do_21260730221412352011585",
    "do_21260744202539008011609",
    "do_21260804380119040011639",
    "do_21260815656922316811665",
    "do_21260815934325555211668",
    "do_21260815964718694411669",
    "do_21260817845485568014",
    "do_212608201239871488110",
    "do_212608204370681856113",
    "do_212608716539797504119",
    "do_212608730835427328129",
    "do_212609423333523456166",
    "do_212609448984469504173",
    "do_212609462951804928175",
    "do_2126097770735288321135",
    "do_2126101064675000321140",
    "do_2126114335260508161208"
];

// var ecar_links = [];

_.each(contentIds,function(content_id){
//   console.log(content_id);
  var options = { method: 'POST',
  url: env_url,
  headers: 
   { 'postman-token': '7f4f38ab-c09b-6295-a292-c69b7caa5109',
     'cache-control': 'no-cache',
     'user-id': 'ilimi',
     'content-type': 'application/json' },
  body: 
   { request: 
      { content_identifiers: [content_id],
        file_name: content_id } },
  json: true };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    // ecar_links.push(body.result.ECAR_URL);
    downloadECAR(body.result.ECAR_URL,content_id);
  });
});

function downloadECAR(ecarURL,content_id){   
    var options = {
        directory: "./input/",
        filename: content_id + ".zip"
    };
    download(ecarURL, options, function(err){
        if (err) throw err
        console.log("Download Done!!!");
    });
}
