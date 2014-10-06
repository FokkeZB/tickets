var fs = require('fs'),
  util = require('util');

var find = require('find'),
  chalk = require('chalk'),
  _ = require('lodash'),
  request = require('request'),
  async = require('async');

var constants = require('./constants'),
  U = require('./util');

module.exports = function tickets(opts, callback) {

  var cfg = {};

  _.each(constants.opts, function forEach(def, opt) {
    cfg[opt] = (typeof opts[opt] === 'undefined') ? def : opts[opt];
  });

  if (!_.isArray(cfg.extensions) && cfg.extensions !== '+') {
    cfg.extensions = ('' + cfg.extensions).split(',');
  }

  if (!_.isArray(cfg.keys) && cfg.keys !== '+') {
    cfg.keys = ('' + cfg.keys).split(',');
  }

  callback || console.info('Scanning files..');

  var dirLn = cfg.dir.length;
  var files;

  try {
    files = find.fileSync(cfg.extensions === '+' ? /./ : (new RegExp('\.(' + cfg.extensions.join('|') + ')$')), cfg.dir); // jshint ignore:line

  } catch (err) {
    return U.die(err, callback);
  }

  if (files.length === 0) {
    return U.die('No files found', callback);
  }

  if (typeof cfg.jira !== 'undefined') {
    var total = [];

    async.each(cfg.jira, function(jiraCfg, cb){

      var jcfg = _.assign(cfg, {
        url: jiraCfg.url,
        keys: jiraCfg.keys,
        username: jiraCfg.username,
        password: jiraCfg.password
      });

      lookupJira(jcfg, function(err, iss){
          if (!err){
            _.each(iss, function(i){ total.push(i); });
            cb();
          } else {
            cb(err);
          }
        }
      );

    }, function(err){

      if (err) {
        return U.die(err);
      }

      callback(null, total);

    });
  } else {
    lookupJira(cfg, callback);
  }


  function lookupJira(cfg, callback){
    var re = new RegExp('[^a-zA-Z0-9](' + ((cfg.keys === '+') ? '[A-Z][_A-Z0-9]*' : '(?:' + cfg.keys.join('|') + ')') + '-[1-9][0-9]*)[^a-zA-Z0-9]', 'gm');
    var issues = {};

    files.forEach(function forEach(file) {
      var path = file.substr(dirLn);

      var contents = fs.readFileSync(file, {
        encoding: 'UTF-8'
      });

      var matches;

      while ((matches = re.exec(contents)) !== null) {

        if (!issues[matches[1]]) {
          issues[matches[1]] = {
            key: matches[1],
            files: {}
          };
        }

        if (!issues[matches[1]].files[path]) {
          issues[matches[1]].files[path] = [];
        }

        var line = (contents.substr(0, matches.index).match(/\n/g) || []).length + 1;

        if (issues[matches[1]].files[path].indexOf(line) === -1) {
          issues[matches[1]].files[path].push(line);
        }
      }

    });

    issues = _.values(issues);

    var ln = issues.length;

    if (ln === 0) {
      return U.die('No issues found', callback);
    }

    callback || console.info('Looking up ' + ln + ' issues..');

    async.eachLimit(issues, 3, function(issue, cb) {

      request({
        url: cfg.url + '/rest/api/2/issue/' + issue.key,
        method: 'GET',
        auth: cfg.username ? {
          username: cfg.username,
          password: cfg.password
        } : null
      }, function(err, response, body) {
        var data;

        if (!err) {

          if (response.statusCode >= 400) {
            err = response.statusCode;

          } else {

            try {
              data = JSON.parse(body);
              if (data.errorMessages) {
                err = data.errorMessages.join(', ');
              }

            } catch (e) {
              err = e.message;
            }
          }
        }

        if (err) {
          issue.error = util.format(
            'Request to Jira for issue "%s" failed with: %d.',
            issue.key, err
          );

        } else {
          issue.fields = data.fields;
        }

        var label;

        if (!callback) {
          console.log();

          if (issue.error) {
            console.log(chalk.cyan(U.strPadRight(issue.key, 15)) + chalk.red(issue.error));

          } else {
            console.log(chalk.cyan(U.strPadRight(issue.key, 15)) + chalk.yellow(issue.fields.summary));
            console.log(chalk.cyan(U.strPadRight('Updated', 15)) + issue.fields.updated);
            console.log(chalk.cyan(U.strPadRight('Status', 15)) + chalk[chalk[issue.fields.status.statusCategory.colorName] ? issue.fields.status.statusCategory.colorName : 'white'](issue.fields.status.name));
            issue.fields.resolution && console.log(chalk.cyan(U.strPadRight('Resolution', 15)) + issue.fields.resolution.name);
            issue.fields.priority && console.log(chalk.cyan(U.strPadRight('Priority', 15)) + issue.fields.priority.name);

            if (issue.fields.fixVersions.length > 0) {

              label = 'Fix Version(s)';
              _.each(issue.fields.fixVersions, function forEachVersion(version) {
                console.log(chalk.cyan(U.strPadRight(label, 15)) + version.name + ' (' + chalk[version.released ? 'green' : 'red'](version.releaseDate || 'unknown') + ')');
                label = '';
              });
            }
          }

          label = 'File(s)';
          _.each(issue.files, function forEachFile(lines, file) {
            console.log(chalk.cyan(U.strPadRight(label, 15)) + file + ' #' + lines.join(', #'));
            label = '';
          });
        }

        cb();

      });

    }, function(err) {

      if (err) {
        return U.die(err);
      }

      if (callback) {
        callback(null, issues);

      } else {
        console.log();
        console.log(chalk.green('Found ' + ln + ' issues'));
      }

    });
  }

};
