var gulp   = require('gulp');
var karma  = require('karma');
var config = karma.config;
var Server  = karma.Server;

/**
 * Run test once and exit
 */
gulp.task('test', function (done) {
  config.parseConfig(
    __dirname + '/../../karma.conf.js', {
      singleRun: true
    }, {
      promiseConfig: true,
      throwErrors:   true,
    }
  ).then(
    (karmaConfig) => {
        new Server(karmaConfig, done).start();          
    },
    (rejectReason) => { /* respond to the rejection reason error */ }
  );
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task('tdd', function (done) {
  config.parseConfig(
    __dirname + '/../../karma.conf.js', {
    }, {
      promiseConfig: true,
      throwErrors:   true,
    }
  ).then(
    (karmaConfig) => {
        new Server(karmaConfig, done).start();          
    },
    (rejectReason) => { /* respond to the rejection reason error */ }
  );    
});

/**
 * Run test once with code coverage and exit
 */
gulp.task('cover', function (done) {
  config.parseConfig(
    __dirname + '/../../karma.conf.js', {
      singleRun: true,
      preprocessors: {
        'test/**/*.js': ['babel'],
        'src/**/*.js':  ['babel']
      }
    }, {
      promiseConfig: true,
      throwErrors:   true,
    }
  ).then(
    (karmaConfig) => {
        new Server(karmaConfig, done).start();          
    },
    (rejectReason) => { /* respond to the rejection reason error */ }
  );   
});
