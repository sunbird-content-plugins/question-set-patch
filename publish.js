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
    publish: '/content/v3/publish/'
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
    "/content-plugins/org.ekstep.questionunit.mtf-1.1/renderer/assets/audio3.png"
];

var success = 0,
    error = 0,
    total = 0;
var updatedContentIds = {
    "success": [],
    "failed": [],
    "withoutBody": [],
    "withoutQS": [],
    "getFailed": [],
    "publishSkipped": []
};


function correctContents() {
    searchContents().then(function(data) {
        var promiseArray = _.map(data, function(id, index) {
            // console.log("content id", content.identifier);
            return correctContent(id)
        });
        Promise.all(promiseArray).then(function(data) {
            console.log("Completed.");
            return fs.writeFile('./publishedContentIds.json', JSON.stringify(updatedContentIds), function(err) {
                
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
        var list = ["do_2125888760831426561986","do_21258888015609036811423"];
        resolve(list);
    });
}

function correctContent(id) {
    return getContentBody(id).then(function(data) {
        var content = JSON.parse(data).result.content;
        if (content && content.status === "Live") {
            return publishContent(content).then(function() {
                updatedContentIds.success.push(content.identifier + "::" + content.pkgVersion);
            });
        } else {
            return new Promise(function(resolve, reject) {
                updatedContentIds.publishSkipped.push(content.identifier);
                resolve(false);
            });
        }
    }, function(err) {
        error++;
        console.log("Content - " + content.identifier + " get failed")
        updatedContentIds.getFailed.push(content.identifier);
    }).catch(function(err) {
        updatedContentIds.failed.push(content.identifier);
        console.log("Error ", err);
    });
}

function publishContent(content) {
    return new Promise(function(resolve, reject) {
        var updateHeaders = _.cloneDeep(headers);
        updateHeaders["x-channel-id"] = content.channel;
        var options = {
            url: env + apis.publish + content.identifier,
            headers: updateHeaders,
            body: {
                "request": {
                    "content": {
                        "lastPublishedBy": content.lastPublishedBy
                    }
                }
            },
            json: true
        };
        // console.log("Request body", options);
        request.post(options, function(err, resp, body) {
            console.log("Publish Body: ", body);
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

function getContentBody(id) {
    return new Promise(function(resolve, reject) {
        var options = {
            url: env + apis.contentRead + id,
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
