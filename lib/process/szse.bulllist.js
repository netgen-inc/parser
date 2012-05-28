var util = require('./util');
var _ = require('underscore');
var queue = require('../queue');
var md5 = require('MD5');

exports.process = function(db, info, match, log_obj, cb) {
    //���빫���б�
    var meta = JSON.parse(info.meta);
    var time = Math.floor(new Date().getTime()/1000);
    console.log('--------------------------------------------------');

    _.each(match.bulletins, function(item, key){
        var key_code = md5(item.stock_code + item.title + item.content);
        db.addBulletin(key_code, item.stock_code, item.title, item.content, meta, time, log_obj, function(error, id){
            if(!error) {
                log_obj.log('11.0.���빫��ɹ���');

                //֪ͨת��΢������
                //queue.bulletin.enqueue(queue.getQueueUrl('bulletin', id));
            }
            else {
                log_obj.log('11.0.���빫��ʧ��:'+error);
            }
        });
    });

    cb();
}