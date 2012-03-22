var _ = require('underscore');
var queue = require('../queue');

exports.process = function(db, info, match, log_obj, cb) {
    //���빫���б�
    var meta = JSON.parse(info.meta);
    var time = Math.floor(new Date().getTime()/1000);

    if(match.bulletin_list && match.bulletin_list.length>0) {
        _.each(match.bulletin_list, function(item, key){
            db.addArticle(item.url, info.stock_code, item.text, "", meta, time, log_obj, function(error, article_id){
                if(!error) {
                    log_obj.log('11.0.���빫��ɹ���');

                    //֪ͨת��΢������
                    queue.article_content.enqueue(queue.getQueueUrl('article_content', article_id));

                    db.addArticleStockCode(article_id, info.stock_code, time, log_obj, function(error, id){
                        //֪ͨת������
                        if(!error) {
                            queue.article_stock.enqueue(queue.getQueueUrl('article_stock', id));
                        }
                        else {

                        }
                    });
                }
                else {
                    log_obj.log('11.0.���빫��ʧ��:'+error);
                }
            });
        });
    }
}
