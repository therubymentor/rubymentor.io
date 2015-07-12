module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    cssmin: {
      options: {
        shorthandCompacting: false,
        roundingPrecision: -1
      },
      target: {
        files: {
          'public/stylesheets/rubymentor.min.css': [
            'public/stylesheets/jquery-2.1.4.min.css',
            'public/stylesheets/animsition.min.css',
            'public/stylesheets/bootstrap.min.css',
            'public/stylesheets/page.css',
            'public/stylesheets/styles.css',
            'public/stylesheets/top_nav.css',
          ]
        }
      }
    },
    uglify: {
      my_target: {
        files: {
          'public/javascripts/rubymentor.min.js': [
            'public/javascripts/jquery-1.11.1.min.js',
            'public/javascripts/bootstrap.min.js',
            'public/javascripts/jquery.animsition.min.js',
            'public/javascripts/jquery.fixedcontent.min.js',
            'public/javascripts/jquery.nav.js',
            'public/javascripts/jquery.parallax-1.1.3.js'
          ]
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  // Default task(s).
  grunt.registerTask('default', ['uglify', 'cssmin']);


};
