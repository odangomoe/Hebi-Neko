const _ = require("lodash");

function Pool(optionArray) {
    this.items = optionArray;
    this.consuming = [];
}

Pool.prototype.next = function () {
    if (this.consuming.length === 0) {
        this.consuming = _.shuffle(this.items);
    }

    let next = this.consuming.shift();

   // console.log(next);
    return next;
};

module.exports = Pool;
