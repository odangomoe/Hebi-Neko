const fs = require("fs");
const proc = require("process");

const _ = require("lodash");
const Promise = require("bluebird");

const Crawler = require("./src/Crawler.js");
const Scheduler = require("./src/Scheduler.js");
const Pool = require("./src/Pool.js");

const config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));

const ips = proc.argv[2].split(",");

const pool = new Pool(_.map(ips, (ip) => ({ localAddress: ip, family: 6 })));

const crawler = new Crawler({
    pool: pool,
    mainPath: config.site,
    torrentPath: config.site + config.torrentPath,
    pagePath: config.site + config.pagePath,
    savePagePath: config.pageSavePath,
    saveTorrentPath: config.torrentSavePath
});

const status = JSON.parse(fs.readFileSync(config.statusPath));

if (!status.items) {
    status.items = [];
}

const sched = new Scheduler({
    crawler: crawler,
    amountParallel: 100,
}, status);

proc.on("exit", () => {
    console.log("Writing last changes!");
    fs.writeFileSync(config.statusPath, JSON.stringify(sched.status, null, 4));
});

proc.on('SIGINT', function () {
    proc.exit();
});

sched.init()
    .then(() => {
        console.log("Succesfully init'd");
        saveLoop();

        sched.tick();
    })
    .catch((e) => {
        console.log("init failed", e);
    });

let writeVal = setInterval(() => sched.writeSimpleStatus(), 500);

function saveLoop() {
    fs.writeFile(config.statusPath, JSON.stringify(sched.status, null, 4), () => {
        if (sched.isDepleted && sched.running.length === 0) {
            clearInterval(writeVal);
            return;
        }
        setTimeout(saveLoop, 5000);
    });
}
