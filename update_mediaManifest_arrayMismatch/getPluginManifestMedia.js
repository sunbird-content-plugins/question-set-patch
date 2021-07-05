var request = require("request");
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var chalk = require('chalk');
var fixContents = require('./fix_affected_contents.js'); 
var plugindir = './plugins';
var pluginsManifest = [];
var pluginsDefaultMedia = [];
var asyresult=false;

fs.readdir(plugindir, function (err, plugin) {
    if (!err) {
        _.each(plugin, function (folderName, index) {
            fs.readFile(plugindir + '/' + folderName + "/manifest.json", function (err, resp, data) {
                if (!err) {
                    var manifest = JSON.parse(resp);
                    var rendererDep = manifest.renderer.dependencies;
                    var defaultMedia = [];
                    _.each(rendererDep, function (key, val) {
                        if (_.isObject(key) && (key.type == (('image') || ('audio')))) {
                            defaultMedia.push(_.pick(key, 'type', 'src'));
                        }
                    });
                    pluginsDefaultMedia.push({
                        pluginId: manifest.id,
                        ver: manifest.ver,
                        media: defaultMedia                        
                    })
                    console.log("Length = " + plugin.length + ", "+ pluginsDefaultMedia.length);
                    if(plugin.length - 1 == pluginsDefaultMedia.length){
                        fixContents.fixAffectedContents();
                    }
                }
            })
        })
    }
});
module.exports.pluginsDefaultMedia=pluginsDefaultMedia;