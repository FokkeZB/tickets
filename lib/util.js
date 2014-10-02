var chalk = require('chalk');

exports.repeat = function repeat(str, num) {
  return new Array(num + 1).join(str);
};

exports.strPadRight = function strPadRight(str, num, pad) {
  
  if (typeof pad !== 'string') {
    pad = ' ';
  }

  return str + exports.repeat(pad, Math.max(0, num - str.length));
};

exports.die = function die(err, cb) {
  
  if (cb) {
    cb(err);

  } else {
    console.error(chalk.red(err));
    process.exit(1);
  }

};