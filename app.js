const request = require("request");
const fs = require('fs');
const _ = require('lodash');
const Logger = require('./logger.js');

// const fromDate = "2018-06-1T00:00:00.000+0530";
// const env = "https://staging.ntp.net.in";
const env = "https://diksha.gov.in";
const apis = {
    compositeSearch: '/action/composite/v3/search',
    itemRead: '/action/assessment/v3/items/read/',
    itemUpdate: '/action/assessment/v3/items/update/'
}
const headers = {
    "content-type": "application/json",
    'cache-control': 'no-cache'
}

// This is for staging only
// 'user-id': 'ilimi',
// 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjNDkyM2Y1Mjg1ZmY0NDdjYmYxMzgwNTQyM2ExZTk4YSJ9.hwQiG6OIFoIJ2O9ec6kau09ltJ-5xA5fWi6aM6NoLEU'

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

var success = 0, error = 0, total = 0, notAffected = 0;

function correctQuestions() {
    searchQuestions().then(function(data) {
        total = data.result.items.length;
        console.log("Total items:", total);        

        _.each(data.result.items, function(question, index) {
            Logger.info("QuestionID: " + JSON.stringify(question.identifier));
            correctQuestion(question);
        })
    }, function(err) {
        console.log(err);
    });
}

function searchQuestions() {
    return new Promise(function(resolve, reject) {
        // Do async job
        var options = {
            url: env + apis.compositeSearch,
            headers: headers,
            body: {
              request: {
                filters: {
                  objectType: ['AssessmentItem'],
                  version: 2,
                  type: "mcq",
                  status: []                  
                },
                limit: 9999,
                offset: 0,
                fields: ['identifier', 'createdOn'],
                sort_by: {"createdOn": "asc"}
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

function correctQuestion(question) {
    getQuestionBody(question).then(function(data) {
        // Steps
        // Get assets
        // Update to relative urls
        //return saveQuestion(result)
        try{
            var question = JSON.parse(data).result.assessment_item;
            console.log("QuestionID: ", question.identifier);
            Logger.info("Total Questions: " + total + " , notAffected: " + notAffected + ", Success: " + success + " , Error: " + error); 
            console.log("Total Questions: " + total + " , notAffected: " + notAffected + ", Success: " + success + " , Error: " + error);

            checkQuestionIsAffected(question, function(quesData){
                console.log("XXXXXXXXX Question is affected, QID: ", quesData.identifier);
                Logger.info("XXXXXXXXX Question is affected, QID: " + quesData.identifier);
                callItemUpdateAPI(quesData).then(function(data){
                    console.log("Question updated successfully.");
                    Logger.info("Question updated successfully.");
                    success++;
                }, function(err){
                    error++;
                    Logger.error("Question updated error: " + JSON.stringify(err));
                    console.error("Question updated error: ", err);            
                });
            });
        } catch(err) {
            Logger.debug("JSON PARSE ERROR:" + data.toString());
        }
        
    }, function(err) {
        console.log(err);
    });
}

function checkQuestionIsAffected(question, callback) {
    var body = JSON.parse(question.body);
    var questionData = body.data.data;
    var isAffectedQues = false;


    var quesDataStr = JSON.stringify(questionData);
    _.each(assetHostPaths, function(hostPath){
        isAffectedQues = quesDataStr.indexOf(hostPath) > -1 ? true : false;
        
        if(isAffectedQues) {
            Logger.info("AssetHostPaths exist in the body" + hostPath);
            return false;
        }
    })
    
    var quesAssets = [];

    // For Question Title
    if(questionData.question){
        addAssets(questionData.question, quesAssets);
    }
    
    // For Question Options
    if(questionData.options){
        // For MCQ
        _.each(questionData.options, function (o) {
            addAssets(o, quesAssets);
        })
    }        

    if(questionData.option){
        // For MTF
        if(questionData.option.optionsLHS){
            _.each(questionData.option.optionsLHS, function (o) {
                addAssets(o, quesAssets);
            })
        }
        if(questionData.option.optionsRHS){
            _.each(questionData.option.optionsRHS, function (o) {
                addAssets(o, quesAssets);
            })
        }
    }  
    
    _.each(questionData.media, function(media) {
    	media.src = getRelativeURL(media.src);
    });
    
    _.each(body.data.media, function(media) {
    	media.src = getRelativeURL(media.src);
    });

    // comparing generated media and actual media    
    _.each(quesAssets, function (quesAsset) {        
        quesAsset.src = getRelativeURL(quesAsset.src);
        var mediaExist = _.find(body.data.media, function (m) { 
            quesAsset.src = quesAsset.src.replace(/\/\//g, "/");
            m.src = m.src.replace(/\/\//g, "/");
            return m.src === quesAsset.src;
        })

        if (!mediaExist) {
            isAffectedQues = true;
        	var mediaId = Math.floor(Math.random() * 1000000000);
            body.data.media.push({
                "id": mediaId,
                "src": quesAsset.src,
                "assetId": mediaId,
                "type": quesAsset.type,
                "preload": false
            })
        }
    })

    if(isAffectedQues){    
        Logger.info("Question Media mismatch : " + question.identifier);    
        question.body = body;
        callback(question);
    } else {
        notAffected++;
    }
}

function getRelativeURL(src) {
    var relativeURLPrefix = "/assets/public/";
    _.forEach(assetHostPaths, function(url){
        if(src && src.indexOf(url) !== -1) {
            src = src.replace(url, relativeURLPrefix);
        }
    });
	
	return src;
}

function addAssets(obj, targetArray){
    if (obj.image) {
        obj.image = getRelativeURL(obj.image);
        targetArray.push({ 'type': 'image', 'src': obj.image })
    }
    if (obj.audio) {
        obj.audio = getRelativeURL(obj.audio);
        targetArray.push({ 'type': 'audio', 'src': obj.audio })
    }
}

function getQuestionBody(question) {
    return new Promise(function(resolve, reject){
        var options = {
            url: env + apis.itemRead + question.identifier,
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

function callItemUpdateAPI(question){
    return new Promise(function(resolve, reject){

        var quesMetadata = {
            identifier: question.identifier,
            channel: question.channel,
            type: question.type,
            code: question.code,
            template_id: question.template_id,
            name: question.name,
            title: question.title,
            body: JSON.stringify(question.body)
        };
        
        if(question.options) quesMetadata.options = question.options;
        if(question.answer) quesMetadata.answer = question.answer;
        if(question.lhs_options) quesMetadata.lhs_options = question.lhs_options;
        if(question.rhs_options) quesMetadata.rhs_options = question.rhs_options;

        var options = {
            method: 'PATCH',
            url: env + apis.itemUpdate + question.identifier,
            headers: headers,
            body: {
                request: {
                    assessment_item: {
                        objectType: "AssessmentItem",
                        metadata: quesMetadata
                    }
                }
            },
            json: true
        }
        
        // console.log(JSON.stringify(quesMetadata));
        // request.patch(options, function(err, resp, body) {
        //     if (err) {
        //         reject(err);
        //         Logger.error("API ITEM UPDATE FAILED" + err.toString());
        //     } else {
        //         if(body.responseCode.toUpperCase() == "OK"){
        //             resolve(body);
        //         } else {
        //             reject(body);
        //         }                
        //     }
        // });
    });
}

correctQuestions();
// correctQuestion({identifier: "do_3126253810252595201500"});
