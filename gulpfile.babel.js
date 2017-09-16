// Documentation

// Gulp:
// http://gulpjs.com/
// https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md
// https://github.com/gulpjs/gulp/blob/master/docs/API.md
// https://zellwk.com/blog/nunjucks-with-gulp/
// https://mozilla.github.io/nunjucks/templating.html#raw

// JS Beautify:
// https://github.com/tarunc/gulp-jsbeautifier
// https://github.com/einars/js-beautify/
// https://github.com/victorporof/Sublime-HTMLPrettify

// Gulp 4.0 alpha
// https://demisx.github.io/gulp4/2015/01/15/install-gulp4.html
// https://www.npmjs.com/package/gulp-4.0.build
// http://stackoverflow.com/questions/22824546/how-to-run-gulp-tasks-sequentially-one-after-the-other

'use strict';

const project = {
  name: 'Kafka\'s Coffee and Tea',
  url: 'http://www.kafkascoffee.ca/'
};

const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const data = require('gulp-data');
const del = require('del');
const eslint = require('gulp-eslint');
const gulp = require('gulp');
const minifyCSS = require('gulp-clean-css');
const nunjucksRender = require('gulp-nunjucks-render');
const prettify = require('gulp-jsbeautifier');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const sass = require('gulp-sass');
const sitemap = require('gulp-sitemap');
const size = require('gulp-size');
const uglify = require('gulp-uglify');

// Delete the dist folder
gulp.task('deleteDist', function() {
  return del(['dist']);
});

// Delete the temp folder
gulp.task('deleteTemp', function() {
  return del(['temp']);
});

// Copy over all files from public folder "as they are" to the dist folder
gulp.task('copyPublic', function() {
  return gulp.src('src/public/**/*')
    .pipe(gulp.dest('dist/'))
    .pipe(connect.reload());
});

// Copy the outdatedbrowser script
gulp.task('copyOutdatedBrowser', function() {
  return gulp.src('bower_components/outdated-browser/outdatedbrowser/outdatedbrowser.min.js')
    .pipe(gulp.dest('dist/assets/js/'))
});

// Compile all HTML
gulp.task('compileHtml', function() {
  return gulp.src('src/templates/pages/**/*.+(html|nunjucks)')
    // .pipe(data(function() { return require('./src/templates/data/people.json') }))
    .pipe(nunjucksRender({
      path: ['src/templates'],
      data: {
        project: project,
        app_name: 'Kafka\'s Coffee and Tea',
        app_url: 'http://www.kafkascoffee.ca/',
      }
    }))
    .pipe(prettify({ config: './jsbeautifyrc.json' }))
    .pipe(gulp.dest('dist'))
    .pipe(sitemap({
      siteUrl: 'http://www.kafkascoffee.ca/',
      changefreq: 'monthly',
      priority: 0.5
    }))
    .pipe(gulp.dest('dist'))
    .pipe(connect.reload());
});

// Compile all CSS
gulp.task('compileCss', function() {
  return gulp.src('src/styles/app.scss')
    .pipe(sass({
      outputStyle: 'expanded',
      includePaths: require('node-normalize-scss').includePaths
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['> 1% in AU', 'Explorer > 9', 'Firefox >= 17', 'Chrome >= 10', 'Safari >= 6', 'iOS >= 6'],
      cascade: false
    }))
    .pipe(rename('styles.css'))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(minifyCSS({
      keepSpecialComments: 'none'
    }))
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(connect.reload());
});

// Lint app JS, warn about bad JS, break on errors
gulp.task('lintJs', function() {
  return gulp.src(['src/js/app.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    // .pipe(eslint.failAfterError())
});

// Create temp/scripts.js
// Transform app JS with Babel ES6 + minify
gulp.task('transformAndMinifyJs', function() {
  return gulp.src(['src/js/app.js'])
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(rename('scripts.js'))
    .pipe(gulp.dest('temp'))
    .pipe(uglify({ preserveComments: 'license' }))
    .pipe(rename('scripts.min.js'))
    .pipe(gulp.dest('temp'));
});

// Create scripts.js
// Merge the vendor JS and app JS (unminified)
gulp.task('concatJs', function() {
  return gulp.src([
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/velocity/velocity.min.js',
      'bower_components/instafeed.js/instafeed.min.js',
      'src/js/vendor/google-analytics.js',
      'temp/scripts.js'
    ])
    .pipe(concat('scripts.js'), { newLine: '\n\n' })
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(connect.reload());

});

// Create scripts.min.js
// Merge the vendor JS and minified app JS
gulp.task('concatJsMin', function() {
  return gulp.src([
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/velocity/velocity.min.js',
      'src/js/vendor/google-analytics.js',
      'temp/scripts.min.js'
    ])
    .pipe(concat('scripts.min.js'), { newLine: '\n\n\n\n' })
    .pipe(replace(/^\s*\r?\n/gm, ''))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(connect.reload());
});

// Compile all JS
gulp.task('compileJs',
  gulp.series(
    gulp.series(
      'lintJs',
      'transformAndMinifyJs'
    ),
    gulp.parallel(
      'concatJs',
      'concatJsMin',
      'copyOutdatedBrowser'
    )
  )
);

// Watch all files and run tasks when files change
gulp.task('watch', function() {
  gulp.watch(['src/public/**/*'], gulp.parallel('copyPublic'));
  gulp.watch(['src/templates/**/*.+(html|nunjucks|json)'], gulp.parallel('compileHtml'));
  gulp.watch(['src/styles/**/*.scss'], gulp.parallel('compileCss'));
  gulp.watch(['src/js/**/*.js', '.babelrc', '.eslintrc'], gulp.parallel('compileJs'));
  gulp.watch(['gulpfile.babel.js', 'package.json', 'bower.json'], gulp.parallel('build'));
});

// Run a local server on http://localhost:9000
gulp.task('serve', function() {
  connect.server({
    root: 'dist',
    livereload: true,
    port: 9000
  });
});

// Build the entire dist folder
gulp.task('build',
  gulp.series(
    'deleteDist',
    gulp.parallel(
      'copyPublic',
      'compileHtml',
      'compileCss',
      'compileJs'
    ),
    'deleteTemp'
  )
);

// Default gulp command
gulp.task('default',
  gulp.series(
    'build',
    gulp.parallel(
      'watch',
      'serve'
    )
  )
);

// Serve the dist files on http://localhost:9000/
gulp.task('serve', function() {
  connect.server({
    root: 'dist',
    livereload: true,
    port: 9000,
  });
});

gulp.task('report', function() {
  return gulp.src(['dist/**/*'])
    .pipe(size({
      showFiles: true,
      showTotal: false
    }))
})

// Build the entire dist folder
gulp.task('build',
  gulp.series(
    'deleteDist',
    gulp.parallel(
      'copyPublic',
      'compileHtml',
      'compileCss',
      'compileJs'
    ),
    gulp.parallel(
      'deleteTemp',
      'report'
    )
  )
);

// Default gulp command
gulp.task('default',
  gulp.series(
    'build',
    gulp.parallel(
      'watch',
      'serve'
    )
  )
);
