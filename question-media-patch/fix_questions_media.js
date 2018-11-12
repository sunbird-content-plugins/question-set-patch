/* modules */
var request = require("request");
var fs = require('fs');
var express = require("express");
var app = express();
var _ = require('lodash');
var chalk = require('chalk');
const CONSTANTS = require('./constants.js');


const affectedQuestionsFolder = CONSTANTS.dir.allQuestions;
const removeAbsolutePath = 'https://ntpstagingall.blob.core.windows.net/ntp-content-staging'; //staging
var affectedQuestions;
var fixedQuestionsDir = CONSTANTS.dir.fixedQuestions;

var value = {
  'before': {},
  'after': {}
}

var patch_options_base = {
  method: 'PATCH',
  url: CONSTANTS.env + CONSTANTS.apiAction.itemUpdate, //'https://staging.ntp.net.in/action/assessment/v3/items/update/',
  headers: CONSTANTS.headers.fixQuestionsMedia,
  body: {
    request: {
      assessment_item: {
        objectType: "AssessmentItem",
        metadata: {

        },
        outRelations: []
      }
    }
  },
  json: true
};


/* root Variables */

//production
// var affectedQuestions_array = [  "do_31261154763329536017", "do_3126123112810086402315",  "do_3126123459680419842333",  "do_3126124420247306242392",  "do_3126124452034396162394",  "do_3126124461015040001169",  "do_3126131206189383681377",  "do_3126143826225807362863",  "do_3126144952384143361646",  "do_3126145614745354242900",  "do_3126154294925639682959",  "do_31261733687835033621189",  "do_31261737144285593621266",  "do_31261737149480960021267",  "do_31261760945611571221326",  "do_31261801896700313621404",  "do_31261805208440012811288",  "do_31261809156578508811364",  "do_31261819121567334411387",  "do_31261819141911347221580",  "do_31261871550495129621667",  "do_31261944670597120011862",  "do_31261945875849216022042",  "do_31261962212418355212016",  "do_31261962239151308822105"]
// var affectedQuestions = [affectedQuestions_array[8]];
// const affectedQuestionsFolder = './all_questions-diksha/' //production
// const removeAbsolutePath = "https://ntpproductionall.blob.core.windows.net/ntp-content-production" //production

//staging

var fixAffectedQuestions = function () {
  console.log("============ Fixing affected questions ============ ");
  Logger.info("============ Fixing affected questions ============ ");
  fs.readdir(CONSTANTS.dir.errorQuestions, function (err, ids) {
    affectedQuestions = ids;
    console.log("affectedQuestions", affectedQuestions)
    global.mediaCount = 0;

    _.each(affectedQuestions, function (a) {
      readFilePromise(affectedQuestionsFolder + a).then(function (data) {
        data = JSON.parse(data);
        var body = JSON.parse(data.result.assessment_item.body);
        var questionData = body.data.data;

        var questionMedia = body.data.media;
        var mediaGeneratedFromQuestion = [];
        value.before = _.cloneDeep(questionData);

        // Checking whether media urls inside question data present inside media, If not present adding them inside
        if (questionData.question.image) mediaGeneratedFromQuestion.push({
          'type': 'image',
          'url': questionData.question.image
        })
        if (questionData.question.audio) mediaGeneratedFromQuestion.push({
          'type': 'audio',
          'url': questionData.question.audio
        })

        switch (body.data.plugin.id) {
          case 'org.ekstep.questionunit.mcq':
            _.each(questionData.options, function (o) {
              if (o.image) mediaGeneratedFromQuestion.push({
                'type': 'image',
                'url': o.image
              })
              if (o.audio) mediaGeneratedFromQuestion.push({
                'type': 'audio',
                'url': o.audio
              })
            })
            break;
          case 'org.ekstep.questionunit.mtf':
            _.each(questionData.option.optionsLHS, function (o) {
              if (o.image) mediaGeneratedFromQuestion.push({
                'type': 'image',
                'url': o.image
              })
              if (o.audio) mediaGeneratedFromQuestion.push({
                'type': 'audio',
                'url': o.audio
              })
            })
            _.each(questionData.option.optionsRHS, function (o) {
              if (o.image) mediaGeneratedFromQuestion.push({
                'type': 'image',
                'url': o.image
              })
              if (o.audio) mediaGeneratedFromQuestion.push({
                'type': 'audio',
                'url': o.audio
              })
            })
            break;
        }

        // comparing generated media and actual media
        _.each(mediaGeneratedFromQuestion, function (mG) {
          var url = mG.url;
          var mediaExist = _.find(questionMedia, function (m) {
            return m.src == url;
          })

          if (!mediaExist) {
            //https://ntpstagingall.blob.core.windows.net/ntp-content-staging/content/do_2126003259960442881130/artifact/download-size_1538125732087.jpeg
            var assetId = url.split('/')[5];
            var valid = false;
            if (assetId != undefined) {
              // This is to exclude cases /assets/public/content/do_hen_536_1475732756_1475732769795.png
              if (assetId.indexOf('.') == -1 && assetId.indexOf('do_') != -1) {
                valid = true;
              } else {
                var assetId = url.split('/')[4];
                if (assetId != undefined) {
                  // This is to exclude cases /assets/public/content/do_hen_536_1475732756_1475732769795.png
                  if (assetId.indexOf('.') == -1 && assetId.indexOf('do_') != -1) {
                    valid = true;
                  }
                } else {
                  console.log(url)
                  console.log(chalk.yellow('Asset Id is undefined'));
                  questionMedia.push({
                    "id": Math.floor(Math.random() * 1000000000),
                    "src": url,
                    "assetId": Math.floor(Math.random() * 100000000000), //when asset id not able retrieve from url
                    "type": mG.type,
                    "preload": false
                  })
                }
              }

              if (valid) {
                questionMedia.push({
                  "id": Math.floor(Math.random() * 1000000000),
                  "src": url,
                  "assetId": assetId,
                  "type": mG.type,
                  "preload": false
                })
              }
            } else {
              console.log(url)
              console.log(chalk.yellow('Asset Id is undefined'));
              Logger.info('Asset Id is undefined')
              questionMedia.push({
                "id": Math.floor(Math.random() * 1000000000),
                "src": url,
                "assetId": Math.floor(Math.random() * 100000000000), //when asset id not able retrieve from url
                "type": mG.type,
                "preload": false
              })
            }

          }
        })


        questionData.media = questionMedia;
        value.after = _.cloneDeep(questionData);
        console.log(chalk.green(`file fix ${a} over`));
        console.log(chalk.yellow(`media inside question ${mediaCount} and media inside media ${questionMedia.length}`))

        data.result.assessment_item.body = JSON.stringify(body);
        removeUnwantedPropertiesForPatch(data.result.assessment_item)
        addPropertiesForPatch(data.result.assessment_item);
        saveFixedQuestion(data.result.assessment_item);
        //patchStart(data.result, body);
      })
    })

  })
}

/* function definitions */
function requestPromise(urlOptions) {
  return new Promise(function (resolve, reject) {
    request(urlOptions, function (err, response) {
      if (err) reject(err);
      else resolve(response)
    })
  })
}

function readFilePromise(file) {
  return new Promise(function (resolve, reject) {
    fs.readFile(file, function (err, data) {
      if (err) {
        Logger.error("Read File Error: " + err.toString());
        reject(err)
      } else resolve(data)
    })
  })
}

function saveFixedQuestion(fixedQ) {
  fs.writeFile(fixedQuestionsDir + fixedQ.identifier + '.json', JSON.stringify(fixedQ.body), function (err) {
    if (err) {
      Logger.error("Write File Error: " + err.toString())
      throw err;
    }
    console.log('Succesfully saved ' + fixedQ.identifier + '.json');
  })
}

function patchStart(data) {
  var patchOption = _.cloneDeep(patch_options_base);
  patchOption.url = patchOption.url + data.assessment_item.identifier;
  patchOption.body.request.assessment_item.metadata = data.assessment_item;
  value = patchOption;
  requestPromise(patchOption).then(function (data) {
    value = data;
    console.log('over');
  }).catch(function (err) {
    console.log(err);
  })
}


function removeUnwantedPropertiesForPatch(Obj) {
  var propertiesToRemove = ["status", "versionKey", "consumerId", "lastUpdatedOn", "appId", "createdOn", "subject"];
  _.each(propertiesToRemove, function (prop) {
    delete Obj[prop];
  })
  return Obj;
}

function addPropertiesForPatch(Obj) {
  var newProperty = "questionTitle";
  Obj[newProperty] = Obj.title;
  return Obj;
}

module.exports.fixAffectedQuestions = fixAffectedQuestions;