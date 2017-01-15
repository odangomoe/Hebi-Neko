const cloudscraper = require("cloudscraper");
const Promise = require("bluebird");
const _ = require("lodash");
const fs = require("fs");
const $ = require("cheerio");
const urlp = require('url');

function Crawler(config) {
    this.pool = config.pool;
    this.pagePath = config.pagePath;
    this.torrentPath = config.torrentPath;
    this.mainPath = config.mainPath;
    this.savePagePath = config.savePagePath;
    this.saveTorrentPath = config.saveTorrentPath;
}

Crawler.prototype.get = function(url) {
    let crawler = this;
    return new Promise(function (res, rej) {
        cloudscraper.request(_.merge({
            url: url,
            method: 'get',
            gzip: true,
            encoding: null
        }, crawler.pool.next()), function (err, resp, body) {
            if (err) {
                return rej(err);
            }

            res([resp, body]);
        });
    })
};

Crawler.prototype.getHighestId = function () {
    return this
        .get(this.mainPath)
        .then(([resp, body]) => {
            let url = $('.tlist .tlistname a', body.toString('utf8')).first().attr('href');
            let urlObj = urlp.parse(url, true);

            return urlObj.query.tid;
        });
};

Crawler.prototype.getPage = function (id) {
    let data;

    return this
        .get(this.pagePath.replace('%d', id))
        .then(([res, body]) => {
            data = [res, body.toString('utf-8')];
            return new Promise((res, rej) => {
                fs.writeFile(this.savePagePath.replace('%d', id), body, (err) => {
                    if (err) {
                        return rej(err);
                    }

                    res();
                });
            });
        }).then(() => {
            return data;
        });
};

Crawler.prototype.getTorrent = function (id) {
    let data;

    return this
        .get(this.torrentPath.replace('%d', id))
        .then(([res, body]) => {
            data = [res, body];
            return new Promise((res, rej) => {
                fs.writeFile(this.saveTorrentPath.replace('%d', id), body, (err) => {
                    if (err) {
                        return rej(err);
                    }

                    res();
                });
            });
        }).then(() => {
            return data;
        });
};

module.exports = Crawler;
