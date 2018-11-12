var CONSTANTS = {
  env: 'https://staging.ntp.net.in', //'https://diksha.gov.in',
  apiAction: {
    compositeSearch: '/action/composite/v3/search',
    itemRead: '/action/assessment/v3/items/read/',
    itemUpdate: '/action/assessment/v3/items/update/'
  },
  dir: {
    errorQuestions: './error_questions/',
    allQuestions: './all_questions/',
    fixedQuestions: './fixed-questions/'
  },
  headers: {
    getQuestionIds: {
      'Postman-Token': '', //add a valid postman-token
      'cache-control': 'no-cache',
      'Accept-Encoding': 'UTF-8',
      'Content-Type': 'application/json'
    },
    getQuestionBody: {
      'postman-token': '', //add a valid postman-token
      'cache-control': 'no-cache'
    },
    fixQuestionsMedia: {
      'postman-token': '', //add a valid postman-token
      'cache-control': 'no-cache',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      connection: 'keep-alive',
      'user-id': 'content-editor',
      cookie: 's%3ACWXH_r4TVtGzM9-g5T0CHRxqrcBLMOj2.h6M5CkNPVY0VP8rr6xFXRnbRjrij0n4rRGObYRc3xAo',
      'content-type': 'application/json'
    }
  }
}

module.exports = CONSTANTS;