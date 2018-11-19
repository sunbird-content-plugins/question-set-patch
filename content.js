const request = require("request");
const fs = require('fs');
const _ = require('lodash');

// const fromDate = "2018-06-1T00:00:00.000+0530";
// const env = "https://staging.ntp.net.in";
const env = "http://localhost:8080/learning-service";
const searchBase = "http://11.3.3.19:9000";
const apis = {
    compositeSearch: '/v3/search',
    itemRead: '/action/assessment/v3/items/read/',
    itemUpdate: '/action/assessment/v3/items/update/',
    contentRead: '/content/v3/read/',
    contentUpdate: '/content/v3/update/',
    publish: 'api/content/v1/publish/'
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
    "https://ekstep-public-dev.s3-ap-south-1.amazonaws.com/"
]

const pluginsDefaultImages = [
    "/content-plugins/org.ekstep.questionunit.ftb-1.0/renderer/assets/audio-blue.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/default-image.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.0/renderer/assets/default-image.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/tick_icon.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/audio-icon2.png",
    "/content-plugins/org.ekstep.questionunit.mcq-1.1/renderer/assets/music-blue.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.0/renderer/assets/audio.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape1.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape2.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape3.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/shape4.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio1.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio2.png",
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio3.png",
    "/content-plugins/org.ekstep.questionunit.reorder-1.0/renderer/assets/backspace.png"
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


function correctContents() {
    searchContents().then(function(data) {
        total = data.result.content.length;
        console.log("Total Contents:", data.result.count);
        // data.result.content = _.slice(data.result.content, 0, 2000); // TODO: Hack

        var promiseArray = _.map(data.result.content, function(content, index) {
            // console.log("content id", content.identifier);
            return correctContent(content)
        });
        Promise.all(promiseArray).then(function(data) {
            console.log("Completed.");
            return fs.writeFile('./updatedContentIds.json', JSON.stringify(updatedContentIds), function(err) {
                
            });
        }).catch(function(err) {
            // console.log("Error ", err)
        })
    }, function(err) {
        // console.log(err);
    })

}

function searchContents() {
    return new Promise(function(resolve, reject) {
        // Do async job
        var options = {
            url: searchBase + apis.compositeSearch,
            headers: headers,
            body: {
                "request": {
                    "filters": {
                        "objectType": ["Content"],
                        "mimeType": "application/vnd.ekstep.ecml-archive",
                        "createdOn": {
                            "min": "2018-06-01T00:00:00.000+0000",
                            "max": "2018-11-15T00:00:00.000+0000"
                        },
                        "status": []
                    },
                    "fields": ["identifier", "createdOn"],
                    "sort_by": { "createdOn": "asc" },
                    "offset": 6000,
                    "limit": 1000
                }
            },
            json: true
        };
        request.post(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        })
    });
}

function correctContent(content) {
    return getContentBody(content).then(function(data) {
        var content = JSON.parse(data).result.content;
        if (content.body) {
            var content_body = JSON.parse(content.body);
            content.fixContent = false;
            _.forEach(content_body.theme.stage, function(stage) {
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
                content.body = JSON.stringify(content_body);
            }
        }
        return content;
        //success++;
    }, function(err) {
        error++;
        console.log("Content - " + content.identifier + " get failed")
        updatedContentIds.getFailed.push(content.identifier);
    }).then(function(content) {
        if (!content || !content.body) {
            return new Promise(function(resolve, reject) {
                updatedContentIds.withoutBody.push(content.identifier);
                resolve(false);
            });
        } else if(!content.fixContent) {
            return new Promise(function(resolve, reject) {
                updatedContentIds.withoutQS.push(content.identifier);
                resolve(false);
            });
        } else {
            return updateContent(content).then(function(data) {
                if (data.responseCode === 'OK'){
                    console.log("Content - " + content.identifier + " updated successfully")
                    updatedContentIds.success.push(content.identifier);
                    // publishContent(content.identifier);
                } else {
                    console.log("Content - " + content.identifier + " updated failed")
                    updatedContentIds.failed.push(content.identifier);
                }
            }, function(err) {
                error++;
                console.log("Content - " + content.identifier + " updated failed")
                updatedContentIds.failed.push(content.identifier);
                // console.log('Content update eroor', err);
            });    
        }
    }).catch(function(err) {
        updatedContentIds.failed.push(content.identifier);
        console.log("Error ", err);
    });
}

function publishContent(contentId) {
    return new Promise(function(resolve, reject) {
        var options = {
            url: env + apis.publish + contentId,
            headers: headers,
            body: {
                "request": {
                    "content": {
                        "lastPublishedBy": "3b34c469-460b-4c20-8756-c5fce2de9e69",
                        "publishChecklist": [],
                        "publishComment": ""
                    }
                }
            },
            json: true
        };
        // console.log("Request body", options);
        request.post(options, function(err, resp, body) {
            if (err) {
                console.log("error is", err);
                reject(err);
            } else {
                resolve(body);
            }
        })
    });
}

function updateContent(content) {
    return new Promise(function(resolve, reject) {
        var updateHeaders = _.cloneDeep(headers);
        updateHeaders["x-channel-id"] = content.channel;
        var options = {
            method: "PATCH",
            url: env + apis.contentUpdate + content.identifier,
            headers: updateHeaders,
            body: {
                "request": {
                    "content": {
                        "versionKey": "jd5ECm/o0BXwQCe8PfZY1NoUkB9HN41QjA80p22MKyRIcP5RW4qHw8sZztCzv87M",
                        "body": content.body
                    }
                }
            },
            json: true
        };
        // console.log("options:", options);
        request(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
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
        console.log("question assets length", quesAssets.length);
    }

    _.each(questionData.media, function(media) {
        media.src = getRelativeURL(media.src)
    });
    console.log('quesAssets ', quesAssets);
    _.each(quesAssets, function(quesAsset) {
        //quesAsset.url = getRelativeURL(quesAsset.url);
        var mediaExist = _.find(questionData.media, function(m) {
            return m.src === quesAsset.src;
        })
        console.log("mediaExist: ", mediaExist);
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

function getContentBody(content) {
    return new Promise(function(resolve, reject) {
        var options = {
            url: env + apis.contentRead + content.identifier + '?mode=edit',
            qs: { fields: 'body,versionKey,status,channel' },
            headers: headers
        }
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        })
    });
}
correctContents();
// correctContent({ identifier: "do_212516013987561472144263" });
