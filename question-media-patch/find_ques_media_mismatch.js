const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const chalk = require('chalk');
const Logger = require('./logger.js');
const CONSTANTS = require('./constants.js');
var fixAffectedQuestions = require('./fix_questions_media.js').fixAffectedQuestions;

let questionsAffected = [];
let inValid = [];
let qTypeCount = {}
let creatorsOfAffectedQs = {};
var errorQuestionsDir = CONSTANTS.dir.errorQuestions;
let currentQuesIndex = 0;

const questionDirective = CONSTANTS.dir.allQuestions;
var error_questions = [];

var findAffectedQuestions = function(){
  console.log("============ Finding affected questions ============ ");
  Logger.info("============ Finding affected questions ============ ");
  fs.readdir(questionDirective, (err, files) => {
    var totalQuestions = files.length;
    _.each(files, function (file) {
      fs.readFile(questionDirective + file, function (err, data) {
        currentQuesIndex++;
        if (err) {
          Logger.error("File Error: " + err.toString());
          // Logger.error(JSON.stringify(question));
          error_questions.push(file);
          //throw new Error(error);
        }
        try {
          data = JSON.parse(data);
        } catch (err) {
          inValid.push(file);
          return;
        }

        var body, affected;
        var assessment_item = data.result.assessment_item;
        console.log("File read: ", assessment_item.identifier);
        try {
          body = JSON.parse(assessment_item.body);
        } catch (err) {
          inValid.push(file);
          return;
        }
        if (!body) {
          return
        };

        var questionData = body.data.data;
        var questionMedia = body.data.media;
        var mediaGeneratedFromQuestion = [];

        if (questionData.question.image)
          mediaGeneratedFromQuestion.push({
            'type': 'image',
            'url': questionData.question.image
          })
        if (questionData.question.audio)
          mediaGeneratedFromQuestion.push({
            'type': 'audio',
            'url': questionData.question.audio
          })

        switch (body.data.plugin.id) {
          case 'org.ekstep.questionunit.mcq':
            _.each(questionData.options, function (o) {
              if (o.image)
                mediaGeneratedFromQuestion.push({
                  'type': 'image',
                  'url': o.image
                })
              if (o.audio)
                mediaGeneratedFromQuestion.push({
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
          //if mediaGeneratedFromQuestion.length(UNIQUE RESOURCE) != questionMedia.length, then the question is affected,
          // Update the question media array
          var url = mG.url;
          var mediaExist = _.find(questionMedia, function (m) {
            return m.src == url;
          })
          if (!mediaExist) affected = true;
          return false;
        })

        if (affected) {
          creatorsOfAffectedQs[assessment_item.createdBy] = 0;
          // console.log(chalk.yellow(JSON.stringify({
          //   'plugin': body.data.plugin.id,
          //   'id': file,
          //   'createBy': assessment_item.createdBy
          // })));
          // console.log(data.id)
          questionsAffected.push({
            'plugin': body.data.plugin.id,
            'id': file,
            'createBy': assessment_item.createdBy,
            'name': assessment_item.name,
            'createdOn': assessment_item.createdOn
          })
          fs.writeFile(errorQuestionsDir + assessment_item.identifier + '.json', JSON.stringify(data), function (err) {
            if (err) {
              Logger.error("File creation failed : " + err.toString());
              Logger.debug(JSON.stringify(assessment_item));
              // error_questions.push(file);
            }
            console.log('Question affected: ' + assessment_item.identifier + '.json');
            console.log( + "/" + totalQuestions);

            if(questionsAffected.length == totalQuestions){
              console.log("===================== Verification completed.. ");
              fixAffectedQuestions();
            } 
          })
        }

        console.log(currentQuesIndex + "/" + totalQuestions + "questions verified");
      })
    })
  })
}

module.exports.findAffectedQuestions = findAffectedQuestions;