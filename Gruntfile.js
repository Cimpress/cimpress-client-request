module.exports = function (grunt) {

  var sourceSet = [
    'Gruntfile.js',
    '**/*.js',
    '!node_modules/**',
    '!coverage/**'
  ];

  grunt.initConfig({
    jshint: {
      files: sourceSet,
      options: {
        expr: true,
        esversion: 6,
        predef: ['-Promise']
      }
    },
    mocha_istanbul: {
      coverage: {
        src: ['test/**/*.js'],
        options: {
          istanbulOptions: ['--include-all-sources']
        }
      }
    },
    jscs: {
      main: sourceSet
    },
    mochaTest: {
      dev: ['node-inspector'],
      options: {
        timeout: 30000
      },
      test: {
        src: ['test/**/*.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks("grunt-jscs");
  grunt.loadNpmTasks('grunt-mocha-istanbul');

  grunt.registerTask('default', ['jshint', 'jscs', 'test']);
  grunt.registerTask('test', ['mochaTest:test']);
  grunt.registerTask('coverage', ['mocha_istanbul']);
};
