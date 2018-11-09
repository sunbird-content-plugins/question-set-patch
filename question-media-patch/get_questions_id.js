var request = require("request");
var chalk = require('chalk');
var fs = require('fs');
const CONSTANTS = require('./constants.js');
const Logger = require('./logger.js');
var getQuestionsBody = require('./get_questions_body.js').getQuestionsBody;

var envUrl = CONSTANTS.env;
var saveFileName = 'composite_search_result.json';

var options = {
  method: 'POST',
  url: envUrl + CONSTANTS.apiAction.compositeSearch,
  headers: CONSTANTS.headers.getQuestionIds,
  body: {
    request: {
      filters: {
        objectType: ['AssessmentItem'],
        createdOn: {
          min: '2018-08-20T00:00:00.000+0530',
          max: '2018-11-08T00:00:00.000+0530'
        },
        status: []
      },
      fields: ['identifier', 'createdOn'],
      sort_by: {
        "createdOn": "asc"
      },
      limit: 9500
    },
  },
  json: true
};

request(options, function (error, response, body) {
  if (error) throw new Error(error);
  console.log(chalk.green('get Successful'));
  fs.writeFile(saveFileName, JSON.stringify(body.result.items), function (err, data) {
    if (err) {
      Logger.error("File Error: " + err.toString())
      throw err;
    }
    console.log(chalk.green('File Store Successfully'));
    getQuestionsBody();
  })

});
