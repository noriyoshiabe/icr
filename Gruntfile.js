module.exports = function (grunt) {
  grunt.initConfig({
    clean: {
      all: ['public']
    },
    
    watch: {
      html: {
        tasks: ['copy:html'],
        files: ['src/**/*.html']
      },
      js: {
        tasks: ['concat:js'],
        files: ['src/javascript/**/*.js']
      },
      css: {
        tasks: ['concat:css'],
        files: ['src/stylesheet/**/*.css']
      },
      image: {
        tasks: ['copy:image'],
        files: ['src/images/**/*.png']
      }
    },

    copy: {
      html: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: '**/*.html',
            dest: 'public/'
          }
        ]
      },
      image: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: '**/*.png',
            dest: 'public/'
          }
        ]
      }
    },

    concat: {
      js: {
        files: {
          'public/application.js': [
            'lib/**/*.js',
            'src/**/*.js'
          ]
        }
      },
      css: {
        files: {
          'public/application.css': [
            'lib/**/*.css',
            'src/**/*.css'
          ]
        }
      }
    },

    bower: {
      install: {
        options: {}
      }
    },
  })

  grunt.loadNpmTasks('grunt-bower-task')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('default', [
    'copy',
    'concat'
  ])
};
