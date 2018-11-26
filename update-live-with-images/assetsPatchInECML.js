const request = require("request");
const fs = require('fs');
const _ = require('lodash');

// const fromDate = "2018-06-1T00:00:00.000+0530";
 const env = "https://staging.ntp.net.in";
const apis = {
    contentRead: '/action/content/v3/read/',
}
const headers = {
    "content-type": "application/json",
    'cache-control': 'no-cache',
    'Accept-Encoding': 'UTF-8'
}

const assetHostPaths = [
    "https://ntpproductionall.blob.core.windows.net/ntp-content-production/",
    "https://ntpstagingall.blob.core.windows.net/ntp-content-staging/",
    "https://s3.ap-south-1.amazonaws.com/ekstep-public-dev/",
    "https://s3.ap-south-1.amazonaws.com/ekstep-public-QA/",
    "https://s3.ap-south-1.amazonaws.com/ekstep-public-prod/", 
    "https://ekstep-public-dev.s3-ap-south-1.amazonaws.com/",
    "https://ekstep-public-qa.s3-ap-south-1.amazonaws.com/",
    "https://ekstep-public-prod.s3-ap-south-1.amazonaws.com/"
]

const pluginsDefaultImages = [
    "/content-plugins/org.ekstep.questionunit-1.0/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit-1.0/renderer/assets/audio-blue.png",
    "/content-plugins/org.ekstep.questionunit.ftb-1.0/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit.ftb-1.0/renderer/assets/audio-blue.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/audio-icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/default-image.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/down-arrow.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/expand-icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/zoomin.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/audio-icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/audio-icon2.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/default-image.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/down_arrow.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/down-arrow.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/expand-icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/music-blue.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/tick_icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/zoomin.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.0/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio1.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio2.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio3.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/down_arrow.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape1.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape2.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape3.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape4.png",
    "/content-plugins/org.ekstep.questionunit.reorder-1.0/renderer/assets/backspace.png",
    "/content-plugins/org.ekstep.questionunit.sequence-1.0/renderer/assets/audio-icon.png",
    "/content-plugins/org.ekstep.questionunit.sequence-1.0/renderer/assets/down_arrow.png"
];

var success = 0,
    error = 0,
    total = 0;
var updatedContentIds = {
    "success": [],
    "failed": [],
    "withoutBody": [],
    "withoutQS": [],
    "getFailed": []
};



function correctContent(content) {
    var promise = new Promise(function(resolve, reject) {
    return getContentBody(content).then(function(data) {
        var content = JSON.parse(data).result.content;
        if (content.body) {
            var content_body = JSON.parse(content.body);
            content.fixContent = false;
            _.forEach(content_body.theme.stage, function(stage) {
                //if(){} // check content having QS
                _.forEach(stage['org.ekstep.questionset'], function(qSet, index) {
                    _.forEach(qSet["org.ekstep.question"], function(question, qindex) {
                        if (question.pluginId == 'org.ekstep.questionset.quiz') {
                            return
                        }
                        content.fixContent = true;
                        var fixedQuestion = updateQuestionMedia(question);
                        qSet["org.ekstep.question"][qindex] = fixedQuestion;
                        content_body.theme.manifest.media = updateContentManifestMedia(content_body.theme.manifest.media, fixedQuestion);
                    });
                });
            });
            if(content.fixContent){
                _.each(content_body.theme.manifest.media, function(media) {
                    media.src = getRelativeURL(media.src)
                });
                _.forEach(pluginsDefaultImages, function(src) {
                    if (_.isUndefined(_.find(content_body.theme.manifest.media, { "src": src }))) {
                        content_body.theme.manifest.media.push(getMediaObj(src, 'image'));
                    }
                });
                content = JSON.stringify(content_body);
            }
        }
        resolve(content);
        //success++;
    }).then(function(content) {
    }).catch(function(err) {
        console.log("Error ", err);
    });
});
return promise;
}

function updateQuestionMedia(question) {
    var affected = false;
    var questionData = JSON.parse(question.data.__cdata);
    var quesAssets = [];

    // For Question Title
    if (questionData.question) {
        addAssets(questionData.question, quesAssets);
    }

    // For Question Options
    if (questionData.options) {
        // For MCQ
        _.each(questionData.options, function(o) {
            addAssets(o, quesAssets);
        })
    }

    if (questionData.option) {
        // For MTF
        if (questionData.option.optionsLHS) {
            _.each(questionData.option.optionsLHS, function(o) {
                addAssets(o, quesAssets);
            })
        }
        if (questionData.option.optionsRHS) {
            _.each(questionData.option.optionsRHS, function(o) {
                addAssets(o, quesAssets);
            })
        }
    }

    if (quesAssets.length > 0) {
       // console.log("question assets length", quesAssets.length);
    }

    _.each(questionData.media, function(media) {
        media.src = getRelativeURL(media.src)
    });
   // console.log('quesAssets ', quesAssets);
    _.each(quesAssets, function(quesAsset) {
        //quesAsset.url = getRelativeURL(quesAsset.url);
        var mediaExist = _.find(questionData.media, function(m) {
            return m.src === quesAsset.src;
        })
        // console.log("mediaExist: ", mediaExist);
        if (!mediaExist) {
            questionData.media.push(getMediaObj(quesAsset.src, quesAsset.type));
        }
    })
    question.data['__cdata'] = JSON.stringify(questionData)
    return question;
}


function updateContentManifestMedia(contentMedia, question) {
    var questionMedia = JSON.parse(question.data.__cdata).media;
    _.each(questionMedia, function(media) {
        if (_.isUndefined(_.find(contentMedia, { "src": media.src }))) {
            contentMedia.push(media);
        }
    })
    return contentMedia;
}

function getMediaObj(src, type) {
    var mediaId = Math.floor(Math.random() * 1000000000);
    return {
        "id": mediaId,
        "src": src,
        "assetId": mediaId,
        "type": type,
        "preload": false
    };
}

function getRelativeURL(src) {
    var relativeURLPrefix = "/assets/public/";
    _.forEach(assetHostPaths, function(url) {
        if (src.indexOf(url) !== -1) {
            src = src.replace(url, relativeURLPrefix);
        }
    });
    return src;
}

function addAssets(obj, targetArray) {
    if (obj.image) {
        obj.image = getRelativeURL(obj.image);
        targetArray.push({ 'type': 'image', 'src': obj.image })
    }
    if (obj.audio) {
        obj.audio = getRelativeURL(obj.audio);
        targetArray.push({ 'type': 'audio', 'src': obj.audio })
    }
}

function getContentBody(contentId) {
    return new Promise(function(resolve, reject) {
        var options = {
            url: env + apis.contentRead + contentId,
            qs: { fields: 'body' },
            headers: headers
        }
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                // console.log(body);
                resolve(body);
            }
        })
    });
}
module.exports.correctContent=correctContent;