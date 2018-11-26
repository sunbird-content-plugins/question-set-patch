var Zip = require('node-7z-forall'); 
var myTask = new Zip();
var rimraf = require('rimraf');
var fs = require('fs');
var _ = require('lodash');
var find = require('find');
var copydir = require('copy-dir');
var zipdir = require('zip-dir');
var updateECML = require('./assetsPatchInECML.js');
var ecmlBuilder = require('./libs/ecmlBuilder.js');

var builder = require('xmlbuilder');

var inputPath = './input';
var output = './extract';

fs.readdir(inputPath, function(err, items) {
    _.each(items,function(file){
        var src = inputPath + "/" + file;
        var content_id = file.split('.zip')[0];
        var dest = output + "/" + content_id;
        extractECAR(src,dest,content_id);
    });
});


function extractECAR(src, dest,content_id){
  myTask.extractFull(src, dest)
  .progress(function (files) {
    var zipfilepath = files.filter(function (value) {
      return value.includes(".zip");
    });
    var source = zipfilepath.toString();
    if(source){
      var destination = source.split('.zip')[0];
      source = dest + "/" + source;
      destination = dest + "/" + destination;
      extractContent(source.trim(), destination.trim(),dest,content_id);
    }
  })
  .then(function () {
    console.log('First level Extraction is Done!!');
  })
  .catch (function (err) {
  });
}


function extractContent(contentPath, location,finalECARPath,content_id)
{
  myTask.extractFull(contentPath.trim(), location.trim())
    .progress(function (files) {
    })
    .then(function () {
      rimraf(contentPath.trim(), function () { console.log('First Directory deleted!!!'); }); 
      fs.readdir(location, function(err, items) {
        var assetsPath = items.filter(function (value) {
           return value.includes("assets");
         });
         var ECMLPath = items.filter(function (value) {
           return value.includes("index.ecml");
         });

        if(ECMLPath.length > 0){
         updateECML.correctContent(content_id).then(function(content){
           var body = buildECML(JSON.parse(content), true);
           fs.writeFile(location + "/index.ecml",body, function(){

            fs.readdir(location + "/" + assetsPath, function(err, files) {
              var temp = files.filter(function (value) {
              return value.includes("content-plugins");
            });

            var dirName = location + "/" + assetsPath + "/" + temp[0];
            copydir.sync('./assets', dirName);
          });
            createContentZip(location,finalECARPath);
           });
          });
        }
      }); 
      console.log('Second level Extraction is Done!!');
    })
    .catch(function (err) {
      console.error(err);
    });
}

function createContentZip(location,finalECARPath){
  var arr = location.split('/');
  var result = location.replace("/" + arr.pop(),'');
  zipdir(location.trim(), { saveTo: result.trim() + "/" +arr.pop() +".zip"}, function (err, buffer) {
    rimraf(location.trim(), function (err) { 
      console.log('Second Directory deleted!!!',err); 
      generateECAR(finalECARPath);
    }); 
  });
}

function generateECAR(ecarPath){
  var arr = ecarPath.split('/');
  zipdir(ecarPath.trim(), { saveTo: "./output/" + arr[2] + ".ecar"}, function (err, buffer) {
  });
}

function start(data, xml) {
  var instance = this;
  var props = _.omitBy(data, _.isObject);
  _.forIn(props, function (value, key) {
      addProperty(key, value, xml);
  });

  var objects = _.pickBy(data, _.isObject);
  _.forIn(objects, function (value, key) {
      addObject(key, value, xml);
  });
}

function addProperty(key, value, xml) {
  switch (key) {
      case "__text":
          xml = xml.txt(value);
          break;
      case "__cdata":
          xml = xml.dat(value);
          break;
      default:
          if (value === 0) {
              xml = xml.att(key, "0");
          } else {
              xml = xml.att(key, (value || '').toString());
          }
  }
}

function addObject(key, value, xml) {
  var instance = this;
  if (_.isArray(value)) {
      _.each(value, function (value) {
          buildXML(key, value, xml);
      });
  } else {
      buildXML(key, value, xml);
  }
}

function buildXML(name, data, xml) {
  var instance = this;
  xml = xml.ele(name);
  var props = _.omitBy(data, _.isObject);
  _.forIn(props, function (value, key) {
      addProperty(key, value, xml);
  });
  var objects = _.pickBy(data, _.isObject);
  _.forIn(objects, function (value, key) {
      if (key === '__cdata') {
          addProperty(key, JSON.stringify(value), xml);
      } else {
          addObject(key, value, xml);
      }
  });
  xml = xml.up()
}

function buildECML(json, prettyPrint) {
  var xml = builder.create('theme');
  start(json.theme, xml);
  if (prettyPrint) {
      return xml.end({
          pretty: true
      });
  } else {
      return xml.end();
  }
}
module.exports.buildECML=buildECML;