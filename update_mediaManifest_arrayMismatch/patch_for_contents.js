var request = require("request");
var fs = require('fs');
var _ = require('underscore');
var dir = './affected-content_body';

fs.readdir(dir, (err, files) => {
  _.each(files,function(key,val){
    fs.readFile('./affected-content_body/'+ key , function(err,data){
      if(!err){
        var content_body = JSON.parse(data);
          if(content_body && content_body.theme && content_body.theme.stage){
           var str_body = JSON.stringify(content_body);
           console.log(JSON.stringify(str_body));
           var str = JSON.stringify(str_body);
           str = str.replace(regex, "/assets/public");
          
           fs.writeFile('./patched_body/' + key,str);
          }
      }
    });
  });
},'utf8');
