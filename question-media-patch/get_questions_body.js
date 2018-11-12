const fs = require('fs');
const request = require("request");
const chalk = require("chalk"); //https://github.com/chalk/chalk
const _ = require('lodash');
const CONSTANTS = require('./constants.js');
const Logger = require('./logger.js');
var findAffectedQuestions = require('./find_ques_media_mismatch.js').findAffectedQuestions;

const store_path = CONSTANTS.dir.allQuestions;
const store_path_error_files = CONSTANTS.dir.errorQuestions;

var all_questions;
var error_questions = [];
var currentQuesIndex = 0;
var envUrl = CONSTANTS.env;
var compositeSearchResultFile = './composite_search_result.json';
var options_base = {
  method: 'GET',
  url: envUrl + CONSTANTS.apiAction.itemRead,
  headers: CONSTANTS.headers.getQuestionBody
};

var getQuestionsBody = function () {
  fs.readFile(compositeSearchResultFile, function (err, data) {
    if (err) {
      console.log(err);
      console.log('Error While Reading question');
      Logger.error("File Error: " + compositeSearchResultFile + ' ' + err.toString())
      process.exit();
    }
    all_questions = JSON.parse(data);
    Logger.info("Env: " + envUrl);
    Logger.info("Total questions: " + all_questions.length);
    getQuestion(all_questions[currentQuesIndex++]);
  })
}

function getQuestion(question) {
  var quesId;
  try {
    quesId = question.identifier;
    var path = store_path + quesId + '.json';
  } catch (err) {
    Logger.error("File Error: " + path + " - " + JSON.stringify(question));
    findAffectedQuestions();
  }

  if (!fs.existsSync(path)) {
    var req_data = _.cloneDeep(options_base);
    req_data.url = req_data.url + quesId;

    //console.log("Request URL : ", req_data.url);
    request(req_data, function (error, response, body) {
      if (error) {
        //throw new Error(error);
        console.log('Error while generating file', store_path + quesId);
        getQuestion(all_questions[currentQuesIndex])
      }
      try {
        if (JSON.parse(body).result.assessment_item == undefined) {
          fs.writeFile(store_path_error_files + quesId + '.json', JSON.stringify(JSON.parse(body).result), function (err) {
            if (err) {
              console.log(chalk.red('Error Save Failed'));
              Logger.error("File Error: " + err.toString());
              console.log(err);
            }
            console.log('Error save Successful of ' + quesId);
          });
        } else {
          fs.writeFile(store_path + question.identifier + '.json', body, function (err) {
            if (err) {
              console.log(chalk.red('Error while generating file', store_path + quesId));
              Logger.error("File Error: " + err.toString());
              Logger.error(JSON.stringify(question));
              error_questions.push(question);
              //throw new Error(error);
            } else {
              console.log('Succesfully saved ' + quesId + '.json');
              Logger.info('Succesfully saved ' + quesId + '.json');
              if (currentQuesIndex <= all_questions.length) {
                getQuestion(all_questions[currentQuesIndex++]);
              } else {
                console.log("---------- Get question failed--------");
                all_questions = _.clone(error_questions);
                currentQuesIndex = 0;
                Logger.warn('get question failed: retrying...')
                getQuestion(all_questions[currentQuesIndex++])
              }
            }
          })
        }
      } catch (e) {
        console.log(chalk.yellow.bgRed("Parse error : ", e));
        Logger.error("Parse error: " + e.toString());
        Logger.error(JSON.stringify(question));
        getQuestion(all_questions[currentQuesIndex++]);
      }
    });
  } else {
    console.log('File already exist: ', path);
    Logger.info("File already exist: " + JSON.stringify(question));
    if (currentQuesIndex <= all_questions.length) {
      getQuestion(all_questions[currentQuesIndex++]);
    } else {
      console.log("All questions downloaded");
    }
  }
}

module.exports.getQuestionsBody = getQuestionsBody;