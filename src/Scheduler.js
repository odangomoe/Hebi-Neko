const _ = require("lodash");
const fs = require("fs");
const cheerio = require("cheerio");
const proc = require("process");


function Scheduler(config, status) {
    this.config = _.assign({}, Scheduler.defaultConfig, config);
    this.status = status;
    this.simpleStatus = {
        failed: 0,
        success: 0,
    };

    this.done = new Array(500);
    this.donePointer = 0;
    this.doneFilled = 0;
    this.running = [];
    this.queued = [];
    this.isDepleted = false;
    this.isHalted = false;
}

Scheduler.defaultConfig = {
    amountParallel: 100,
};

Scheduler.prototype.getSimpleStatus = function () {
    let speed = _.sum(this.done.slice(0, this.doneFilled)) / _.max([1, this.doneFilled]);

    return {
        queued: this.queued.length,
        running: this.running.length,
        success: this.simpleStatus.success,
        failed: this.simpleStatus.failed,
        speed: Math.ceil(speed) + "ms per request",
        'finished in': Math.ceil(((this.queued.length / this.config.amountParallel) * speed) / 60000) + " minutes                 "
    };

};

Scheduler.prototype.writeSimpleStatus = function () {
    let msg = _.reduce(this.getSimpleStatus(), (res, val, key) => `${res}${key}: ${val} `, "");
    proc.stdout.write(msg + "\r");
};

Scheduler.prototype.init = function () {
    let scheduler = this;

    return this.getHighestId()
        .then((id) => {
            console.log("Newest highest id is: " + id);
            return scheduler.fill(id);
        })
        .then(() => {
            scheduler.queued = _.concat(
                _.filter(
                    scheduler.status.items,
                    {
                        status: "created",
                    }
                ),
                _.filter(
                    scheduler.status.items,
                    {
                        status: "queued",
                    }
                ),
                _.filter(
                    scheduler.status.items,
                    {
                        status: "failed",
                    }
                )
            );

            scheduler.simpleStatus.queued = scheduler.queued.length;

            _.each(scheduler.queued, (item) => {
                item.status = "queued";
                item.queuedAt = Date.now();
            })
        });
};

Scheduler.prototype.fill = function (to) {
    const highest = _.max(_.map(this.status.items, 'id')) || 0;
    console.log("Latest id in DB: " + highest);

    for (let i = highest+1; i <= to; i++) {
        this.status.items.push({
            status: "created",
            createdAt: Date.now(),
            id: i,
        })
    }
};

Scheduler.prototype.getHighestId = function () {
    return this.config.crawler.getHighestId();
};

Scheduler.prototype.tick = function () {



    if (this.isDepleted || this.isHalted) {
        return;
    }

    let toStart = this.config.amountParallel - this.running.length;

    for (let i = 0; i < toStart && !(this.isDepleted || this.isHalted); i++) {
        this.startNext();
    }
};

Scheduler.prototype.select = function () {
    let next = this.queued.shift();
    if (!next) {
        this.isDepleted = true;
    }

    return next;
};

Scheduler.prototype.startNext = function () {
    let item = this.select();
    if (!item) {
        return;
    }

    this.running.push(item);

    this.start(item)
        .then((result) => {
            item.status = "success";
            item.hasTorrent = result;
            item.succeededAt = Date.now();

            this.done[this.donePointer++%this.done.length] = item.succeededAt - item.startedAt;

            if (this.doneFilled < this.done.length) {
                this.doneFilled++;
            }

            this.simpleStatus.success++;

            return item;
        })
        .catch((err) => {
            item.status = "failed";
            item.error = err;
            item.failedAt = Date.now();

            this.simpleStatus.failed++;

            return item;
        })
        .then((item) => {
            _.pull(this.running, item);
        })
        .then(() => this.tick());
};

Scheduler.prototype.start = function (item) {
    item.startedAt = Date.now();

    return this.config.crawler.getPage(item.id).then(([resp, body]) => {
        let img = cheerio('img[alt="Download"]', body);
        if (img.length > 0) {
            return this.config.crawler.getTorrent(item.id).then(() => true);
        } else {
            return false;
        }
    });
};

module.exports = Scheduler;
