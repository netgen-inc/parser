var config = require('../config/config').config;

var mysql = require('mysql');

var client = mysql.createClient( config.mysql );
//client.query('USE stock_radar');
//client.query('set charset utf8');

var Db = function() {
    var self = this;

    self.getInfoByPageId = function(page_id, cb) {
        client.query(
            'SELECT * FROM page_content WHERE id='+page_id,
            function(error, results, fields) {
                if (error) {
                    console.log('getInfoByPageId:'+error);
                    cb(error);
                    return;
                }

                if(results.length==0) {
                    cb('empty');
                }
                else {
                    cb(null, results[0]);
                }
            }
        );
    }
}


Db.prototype.addUrl = function(url, in_time, stock_code, site, type, log_obj, cb) {
    log_obj.log("4.1 检查URL是否已经抓取过:"+url);
    client.query('SELECT * FROM url WHERE url=? AND stock_code = ? ', [url,stock_code], function(error, results, fields) {
        if (error) {
            cb(error, null);
            return;
        }

        if(results.length>0) {
            cb('url_stock_exist', null);
            return;
        }
        else {
            log_obj.log("4.2 插入新的URL:"+url);
            client.query('INSERT INTO url SET url = ?, in_time = ?, stock_code = ?, site = ?, type = ?', [ url, in_time, stock_code, site, type ], function(err, results) {
                if (err) {
                    cb(err, null);
                }
                else {
                    cb(null, results.insertId);
                }
            });
        }
    });
}

Db.prototype.addArticle = function(url, stock_code, title, content, meta, in_time, log_obj, cb) {
    log_obj.log('6.1 开始检查文章已经存在。');
    client.query('SELECT id FROM article_content WHERE url=?', [url], function(error, results, fields) {
        if (error) {
            log_obj.log('6.2 检查文章报错:'+error);
            cb(error, undefined);
            return;
        }

        //如果已经存在记录
        if(results.length>0) {
            log_obj.log('6.2 文章已经存在.');
            cb(undefined, results[0].id);
            return;
        }
        else {
            log_obj.log('6.2 开始插入文章.');
            client.query('INSERT INTO article_content SET source=?, url = ?, title = ?, in_time = ?, stock_code = ?, content = ?, meta = ?', [ meta.site, url, title, in_time, stock_code, content, JSON.stringify(meta) ], function(err, results) {
                if (err) {
                    log_obj.log('6.3 插入文章失败:'+err);
                    cb(err, undefined);
                }
                else {
                    log_obj.log('6.3 插入文章成功.');
                    cb(undefined, results.insertId);
                }
            });
        }
    });
}

Db.prototype.addArticleStockCode = function(article_id, stock_code, in_time, content_key, log_obj, cb) {
    log_obj.log('7.1 开始检查文章对应股票是否存在。');
    client.query('INSERT INTO article_stock SET article_id=?, stock_code = ?, in_time = ?, content_key = ?', [ article_id, stock_code, in_time, content_key ], function(err, results) {
        if (err) {
            log_obj.log('7.2 文章对应股票添加失败'+err);
            cb(err);
        }
        else {
            log_obj.log('7.2 文章对应股票添加成功。');
            cb(null, results.insertId);
        }
    });
}

Db.prototype.updateParserTime = function(url_id, parser_time, cb) {
    client.query('UPDATE page_content set parse_time=? WHERE id=?', [parser_time,url_id], function(error, results, fields) {
        if (error) {
            cb(error);
            return;
        }

        cb(undefined);
    });
}

Db.prototype.getContentInfoByKey = function(content_key, cb) {
    client.query('SELECT * FROM article_content_info WHERE content_key=?', [content_key], function(error, results, fields) {
        if (error) {
            //log_obj.log('6.2 检查文章报错:'+error);
            cb(error);
            return;
        }
        else {
            if(results.length>0) {
                cb(null, results[0]);
            }
            else {
                cb('no-info');
            }
        }
    });
}

Db.prototype.addContentKey = function(url, title, meta, stock_code, source, in_time, total_page, content_key, log_obj, cb) {
    log_obj.log('21.1 开始插入content_key信息。');
    client.query('INSERT INTO article_content_info SET url=?, title = ?, meta = ?, stock_code = ?, source = ?, in_time = ?, total_page = ?, content_key = ?', [ url, title, meta, stock_code, source, in_time, total_page, content_key ], function(err, results) {
        if (err) {
            log_obj.log('21.2 插入content_key信息'+err);
            cb(err);
        }
        else {
            log_obj.log('21.2 插入content_key信息成功。');
            cb(null, results.insertId);
        }
    });
}

Db.prototype.addContentPage = function(content_key, page, content, time, log_obj, cb) {
    log_obj.log('22.1 开始插入content_page信息。');
    client.query('INSERT INTO article_content_page SET content_key=?, page = ?, content = ?, in_time = ?', [ content_key, page, content, time ], function(err, results) {
        if (err) {
            log_obj.log('22.2 插入content_page信息失败:'+err);
        }
        else {
            log_obj.log('22.2 插入content_page信息成功:');
        }
        cb();
    });
}

Db.prototype.checkAppPageFinished = function(content_key, log_obj, cb){
    var _self = this;
    log_obj.log('23.1 开始检查所有页面是否抓取完毕。');
    client.query('SELECT * FROM article_content_page where content_key=?', [content_key], function(err,results,fields){
        if(err) {
            log_obj.log('23.2 开始检查所有页面是否抓取完毕错误:'+err);
            return;
        }

        client.query('SELECT * FROM article_content_info WHERE content_key=?', [content_key], function(error, info, fields) {
            if (err) {
                log_obj.log('23.3 开始检查所有页面是否抓取完毕错误:'+err);
                return;
            }
            else {
                //如果已经抓全
                if(!err && info.length>0 && results.length==info[0].total_page && info[0].article_id==0) {
                    log_obj.log('23.4 所有页面已经抓取完毕。');
                    var arr = [];
                    for(var i=0;i<results.length;i++) {
                        arr.push( results[i].content );
                    }
                    var content = arr.join("\r\n");

                    var meta = JSON.parse(info[0].meta);
                    _self.addArticle(info[0].url, info[0].stock_code, info[0].title, content, meta, info[0].in_time, log_obj, function(err,article_id){
                        log_obj.log('23.5 添加合并后的页面。');
                        client.query('UPDATE article_stock SET article_id=? where content_key = ?', [ article_id, content_key ], function(err, results) {
                            if (err) {
                                //log_obj.log('7.2 文章对应股票添加失败'+err);
                                log_obj.log('23.5 添加合并后的页面失败：'+err);
                            }
                            else {
                                client.query('UPDATE article_content_info SET article_id=? where content_key = ?', [ article_id, content_key ]);
                                log_obj.log('23.5 添加合并后的成功。');
                                cb( article_id );
                            }

                            client.query('UPDATE article_content_info SET article_id=? where content_key = ?', [ article_id, content_key ]);
                        });
                    });
                }
            }
        });
    });
}

exports.db = new Db();