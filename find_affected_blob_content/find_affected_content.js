var request = require("request");
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var dir = './all-content';
var affected_content = [];
fs.readdir(dir, function(err, files) {
  _.each(files, function(key, val) {
    fs.readFile('./all-content/' + key, function(err, data) {
      if (!err) {
        var content_data = JSON.parse(data);
        if (content_data && content_data.result && content_data.result.content && content_data.result.content.body) {
          try {
            var content_body = JSON.parse(JSON.parse(data).result.content.body);
            var body_str = JSON.parse(data).result.content.body;
            if (content_body && content_body.theme && content_body.theme.stage) {
              _.each(content_body.theme.stage, function(v, k) {
                console.log("1");
                var questionSetObj = v['org.ekstep.questionset'];
                if (questionSetObj) {
                  // put regEx to match the string
                  var res = JSON.stringify(questionSetObj).match();//give string to search
                  //var res = questionSetObj.toString().match(/blob/gm);
                  if (res != null && res.length > 0) {
                    var id = key;
                    var body = JSON.stringify(content_body);
                    affected_content.push(id);
                    fs.writeFile('./affected_content_ids/' + id + '.json', id);
                    fs.writeFile('./affected-content_body/' + id + '.json', body);
                  }
                }
              });
            }
          } catch (e) {
            console.log("Parsing Error", e);
          }
        }
      }
    });
  });
});