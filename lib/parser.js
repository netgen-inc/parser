var util = require("util");
var event = new require("events").EventEmitter;
var Workers = require('./workers').Workers;
var output = require('./log').log;
var db = require('./db').db;
var url = require('url');
var config = require('../config/config').config;

var Parser = function(number) {
  var self = this;
  var workers = new Workers(number);
  var queue = require('queuer');
  var q_content = queue.getQueue(config.queue, 'page_content');
  var url_content = queue.getQueue(config.queue, 'url');
  var article_content = queue.getQueue(config.queue, 'article_content');

  function parsePage(task, cb) {
    //console.log(task);

    //解析URI
    try {
      var url_info = url.parse(task.uri);
    }
    catch(e) {
      console.log('错误的Task：' + task);
      self.emit('uri-error');
      return false;
    }

    var url_id = url_info.hash.substr(1);
    db.getInfoByPageId(url_id, function(error, info){
      if(error!='good') {
        //console.log('getInfoByPageId:'+error+' '+ task.uri);
        self.emit('no-page-content');
        return;
      }

      //console.log(content_info);
      var meta = JSON.parse(info.meta);
      console.log('parse url: '+'['+url_id+'] '+meta.url);

      workers.send({text:info.content, site:meta.site, type:meta.type}, function(error, match){
        cb();
        console.log(match);

        if(error) {
          self.emit(error);
        }
        else {
          //插入URL表
          for(var i=0;i<match.url_list.length;i++) {
            db.addUrl(match.url_list[i].url, getTime(), info.stock_code, meta.site, match.url_list[i].type, function(url_id){
              if(url_id>0) {
                url_content.enqueue('mysql://172.16.33.237:3306/stock_radar?url#'+url_id);
              }
            });
          }

          if(match.image_list.length>0) {
            meta['has_images'] = true;
          }

          //插入文章内容表
          if(match.content) {
            db.addArticle(meta.url, info.stock_code, match.title, match.content, meta, getTime(), function(article_id){
              if(article_id>0) {
                article_content.enqueue('mysql://172.16.33.237:3306/stock_radar?article_content#'+article_id);
                console.log('Add Article:'+article_id);
              }
              else {
                console.log('Skip Article:'+article_id);
              }
            });
          }

          self.emit('task-finished', task);
        }
      });
    });
  }

  function getTime() {
    return Math.floor(new Date().getTime()/1000);
  }

  self.on('has-task', function(){
    output('Check Task.');
    var func = function(){
      output('Workers Queue:'+workers.queueLength());
      if( workers.queueLength()>number/2) {
        output('Workers Queue is Full:'+workers.queueLength());
        return;
      }

      q_content.dequeue(function(error, task){
        //error = 'yes';
        //task = {'queue':'page_content',uri:'mysql://172.16.39.117:3306/spider?url#121'};
        if(error!='empty') {
          parsePage(task, func);
        }
        else {
          output('Check Succeed. No Task.');
        }
      });
    }
    func.call();
  })

  self.queueLength = function(){
    return workers.queueLength();
  }
}
util.inherits(Parser, event);



exports.Parser = Parser;
