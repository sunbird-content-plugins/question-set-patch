var request = require("request");
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var qs_affecteddir = './qs_affected'
var qs_fixeddir = './qs_fixed'
var chalk = require('chalk');
var pluginManifest=require('./getPluginManifestMedia');

var value = {
    'before': {},
    'after': {}
}
var defaultRendererMedia;
var affected_content = [];
var currentIndex = 0;
var affectedFiles = []

function fixAffectedContents(){
    
    fs.readdir(qs_affecteddir, function(err, files) {
        affectedFiles = files;
        console.log('ffectedFiles.length ',affectedFiles.length);
        readAffectedContent(currentIndex++);
    });
}

function readAffectedContent(index){
    var filename = affectedFiles[index]
    console.log(filename, (/^\..*/.test(filename)));
    fs.readFile('./qs_affected/' + affectedFiles[index], function(err, data) {
        if (!err) {
            var content_data = data ? JSON.parse(data) : undefined;
            if (content_data && content_data.result && content_data.result.content && content_data.result.content.body) {
                var content_body = JSON.parse(JSON.parse(data).result.content.body);
                var body_str = JSON.parse(data).result.content.body;
                if (content_body && content_body.theme && content_body.theme.stage) {
                    findContentMediaMismatchForQS(content_body, content_data.result.content.identifier);
                }
            }
            if(affectedFiles.length - 1 > index){
                readAffectedContent(currentIndex++);
            }
        }else{
            console.log('Error ', err);
        }
    });
}

fs.readFile("./pluginManifestMedia/media.json", function(err,data){
    if(!err){
        defaultRendererMedia = data;
        // console.log(globalRendererMedia);
    }
});
function getMediasFromQuestion(question) {
    var questionData = JSON.parse(question.data.__cdata);
    var questionMedias = [];
    if (questionData.question.image) {
        questionMedias.push({
            'type': 'image',
            'url': questionData.question.image
        })
    }
    if (questionData.question.audio) {
        questionMedias.push({
            'type': 'audio',
            'url': questionData.question.audio
        })
    }

    switch (question.pluginId) {
        case 'org.ekstep.questionunit.mcq':
            _.each(questionData.options, function(o) {
                if (o.image) questionMedias.push({
                    'type': 'image',
                    'url': o.image
                })
                if (o.audio) questionMedias.push({
                    'type': 'audio',
                    'url': o.audio
                })
            })
            break;
        case 'org.ekstep.questionunit.mtf':
            _.each(questionData.option.optionsLHS, function(o) {
                if (o.image) questionMedias.push({
                    'type': 'image',
                    'url': o.image
                })
                if (o.audio) questionMedias.push({
                    'type': 'audio',
                    'url': o.audio
                })
            })
            _.each(questionData.option.optionsRHS, function(o) {
                if (o.image) questionMedias.push({
                    'type': 'image',
                    'url': o.image
                })
                if (o.audio) questionMedias.push({
                    'type': 'audio',
                    'url': o.audio
                })
            })
            break;
    }
    //console.log("q TYPE: ", question.pluginId);
    questionMedias = addDefaultMedia(question, questionMedias);
    return questionMedias;
}

function getAffectedQuestion(question, data, qindex) {
    var questionData = JSON.parse(question.data.__cdata);
    var questionMedia = questionData.media;
    var affected = false;
   // console.log(pluginManifest.pluginsDefaultMedia);
    var mediaGeneratedFromQuestion = getMediasFromQuestion(question);
    //console.log("Question Media default list: ", JSON.stringify(mediaGeneratedFromQuestion));
    //console.log("Question Media: ", JSON.stringify(questionMedia))
    // comparing generated media and actual media
    _.each(mediaGeneratedFromQuestion, function(mG) {
        //if mediaGeneratedFromQuestion.length(UNIQUE RESOURCE) != questionMedia.length, then the question is affected,
        // Update the question media array
        var url = mG.url;
        var mediaExist = _.find(questionMedia, function(m) {
            return m.src == url;
        })
        if (!mediaExist) affected = true;
        return false;
    })

    //console.log("Is Affected: ", affected);
    return affected;
}

function fixAffectedQuestion(question) {
    // data = JSON.parse(data);
    // var body = JSON.parse(data.result.assessment_item.body);
    var body = question;
    //console.log('question ', question);
    var questionData = JSON.parse(question.data.__cdata);
    var questionMedia = questionData.media;
    var mediaLength = questionData.media.length
    var mediaGeneratedFromQuestion = [];
    //var before = _.cloneDeep(questionData);

    // Checking whether media urls inside question data present inside media, If not present adding them inside
    if (questionData.question.image) mediaGeneratedFromQuestion.push({
        'type': 'image',
        'url': questionData.question.image
    })
    if (questionData.question.audio) mediaGeneratedFromQuestion.push({
        'type': 'audio',
        'url': questionData.question.audio
    })

    switch (question.pluginId) {
        case 'org.ekstep.questionunit.mcq':
            _.each(questionData.options, function(o) {
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
            _.each(questionData.option.optionsLHS, function(o) {
                if (o.image) mediaGeneratedFromQuestion.push({
                    'type': 'image',
                    'url': o.image
                })
                if (o.audio) mediaGeneratedFromQuestion.push({
                    'type': 'audio',
                    'url': o.audio
                })
            })
            _.each(questionData.option.optionsRHS, function(o) {
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
    mediaGeneratedFromQuestion = addDefaultMedia(question, mediaGeneratedFromQuestion);

    // comparing generated media and actual media
    _.each(mediaGeneratedFromQuestion, function(mG) {
        var url = mG.url;
        var mediaExist = _.find(questionMedia, function(m) {
            return m.src == url;
        })

        if (!mediaExist) {
            //https://ntpstagingall.blob.core.windows.net/ntp-content-staging/content/do_2126003259960442881130/artifact/download-size_1538125732087.jpeg
            var assetId = url && url.split('/')[5];
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
                        // console.log(url)
                        // console.log(chalk.yellow('Asset Id is undefined'));
                        if(url){
                            questionMedia.push({
                                "id": Math.floor(Math.random() * 1000000000),
                                "src": url,
                                "assetId": Math.floor(Math.random() * 100000000000), //when asset id not able retrieve from url
                                "type": mG.type,
                                "preload": false
                            })
                        }
                    }
                }

                if (valid && url) {
                    questionMedia.push({
                        "id": Math.floor(Math.random() * 1000000000),
                        "src": url,
                        "assetId": assetId,
                        "type": mG.type,
                        "preload": false
                    })
                }
            } else {
                // console.log(url)
                // console.log(chalk.yellow('Asset Id is undefined'));
                if(url){
                    questionMedia.push({
                        "id": Math.floor(Math.random() * 1000000000),
                        "src": url,
                        "assetId": Math.floor(Math.random() * 100000000000), //when asset id not able retrieve from url
                        "type": mG.type,
                        "preload": false
                    })
                }
            }

        }
    })

    questionData.media = questionMedia;
    //var after = _.cloneDeep(questionData);
    console.log(chalk.yellow(`media inside question ${mediaLength} and media inside media ${questionMedia.length}`))
    body.data['__cdata'] = JSON.stringify(questionData)
    return body;
}

function addDefaultMedia(question, mediaArrayObj){
    //console.log("== question: ", JSON.stringify(question));
   
    var pluginMediaObj = _.findWhere(pluginManifest.pluginsDefaultMedia, {"pluginId": question.pluginId, "ver": question.pluginVer});
    //console.log("pluginMediaObj: ", JSON.stringify(pluginMediaObj));
    if(pluginMediaObj){
        var defaultMediaArr = [];
        _.each(pluginMediaObj.media, function(obj){
            defaultMediaArr.push({"id": Math.floor(Math.random() * 1000000000),
                        "src": '/content-plugins/'+ question.pluginId + '-' + question.pluginVer  + obj.src,
                        "assetId": Math.floor(Math.random() * 100000000000), //when asset id not able retrieve from url
                        "type": obj.type,
                        "preload": false})
        });
    }
    var mediaArr = pluginMediaObj ? _.union(mediaArrayObj, defaultMediaArr) : mediaArrayObj;
    return mediaArr;
}

function updateManifestMediaOfContent(contentMedia, question) {
    var questionData = JSON.parse(question.data.__cdata);
    var questionMedia = questionData.media;
    _.each(questionMedia, function(media) {
        if (_.isUndefined(_.findWhere(contentMedia, { "src": media.src }))) {
            contentMedia.push(media);
        }
    })
    contentMedia = addDefaultMedia(question, contentMedia);
    return contentMedia;
}

function findContentMediaMismatchForQS(data, contentId) {
    var stage_data = data.theme.stage;
    _.each(data.theme.stage, function(stage) {
        _.each(stage['org.ekstep.questionset'], function(qsSet, index) {
           // console.log('N.of Question ', qsSet["org.ekstep.question"].length , 'contentId', contentId);
            _.each(qsSet["org.ekstep.question"], function(question, qindex) {
                if (question.pluginId == 'org.ekstep.questionset.quiz') {
                    console.log('not applicable')
                    return
                }
                // console.log("------------------------>",question);
                var isQuestionEffected = getAffectedQuestion(question, data, qindex);
                //console.log("isQuestionEffected: ", isQuestionEffected);
                if (isQuestionEffected) {
                    fixedQuestion = fixAffectedQuestion(question);
                    qsSet["org.ekstep.question"][qindex] = fixedQuestion;
                    var contentMedia = []
                    if (data.theme.manifest.media) {
                        contentMedia = data.theme.manifest.media
                    }
                    contentMedia = updateManifestMediaOfContent(contentMedia, fixedQuestion);
                    data.theme.manifest.media = contentMedia;
                }
                
            });
            //console.log('After qsSet ', qsSet);
            //var qsSet = _.map(qsSet, function(o) { return _.pick(o, 'q'); });
        });
    });
    var content_body = JSON.stringify(data);
    content_body= content_body.split("https:\/\/ntpstagingall.blob.core.windows.net\/ntp-content-staging/")
                         .join("/assets/public/");
    fs.writeFile(qs_fixeddir + '/' + contentId + '.json', content_body);
}

module.exports.fixAffectedContents=fixAffectedContents;