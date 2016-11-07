import gulp from 'gulp';
import notify from 'gulp-notify';
import concat from 'gulp-concat';
import sourcemaps from 'gulp-sourcemaps';
import gulpIf from 'gulp-if';
import newer from 'gulp-newer';
import debug from 'gulp-debug';
import autoprefixer from 'gulp-autoprefixer';
import remember from 'gulp-remember';
import browserSync from 'browser-sync';
import streamCombiner2 from 'stream-combiner2';
import del from 'del';
import path from 'path';
import webpackStream from 'webpack-stream';
import named from 'vinyl-named';

const webpack = webpackStream.webpack;
const browserSyncer = browserSync.create();
const combiner = streamCombiner2.obj;
let isDevelopment = false;


gulp.task('styles', function () {
    return gulp.src('src/styles/**/*.css', { since: gulp.lastRun('styles') })
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(autoprefixer())
        .pipe(remember('styles'))
        .pipe(concat('main.css'))
        .pipe(gulpIf(isDevelopment, sourcemaps.write()))
        .pipe(gulp.dest('dist/styles'));
});

gulp.task('webpack', function (callback) {
    let firstBuildReady = false;

    function done(err, stats) {
        firstBuildReady = true;
        if (err) {
            return;
        }
    }

    return combiner(
        gulp.src('src/*.js'),
        named(),
        webpackStream({
            output: {
                publicPath: '/'
            },
            watch: isDevelopment,
            devtool: isDevelopment ? 'cheap-module-inline-source-map' : null,
            module: {
                loaders: [{
                    test: /\.js$/,
                    include: path.join(__dirname, 'dev'),
                    loader: 'babel?presets[]=react,presets[]=es2015,presets[]=stage-0'
                }]
            },
            plugins: [
                new webpack.NoErrorsPlugin()
            ]
        }, null, done),
        gulp.dest('dist'),
    )
        .on('data', function () {
            if (isDevelopment && !callback.called) {
                callback.called = true;
                callback();
            }
        })
        .on('error', notify.onError(function (err) {
            return {
                title: 'JS',
                message: err.message
            }
        }));
});

gulp.task('clean', function () {
    return del('dist');
});

gulp.task('assets', function () {
    return gulp.src('src/**/*.html', { since: gulp.lastRun("assets") })
        .pipe(newer('dist'))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
    gulp.watch('src/styles/**/*.css', gulp.series('styles')).on('unlink', function (filepath) {
        remember.forget('styles', path.resolve(filepath));
    });
    gulp.watch('src/assets/**/*.*', gulp.series('assets'));
    gulp.watch('src/**/*.html', gulp.series('assets'));
})

gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('styles', 'assets', 'webpack')
));


gulp.task('server', function () {
    browserSyncer.init({
        server: './dist/'
    });
    browserSyncer.watch(['dist/**/*.*', 'index.html']).on('change', browserSyncer.reload);
});

gulp.task('dev',
    gulp.series(
        function (callback) { isDevelopment = true; callback(); },
        'build',
        gulp.parallel('watch', 'server')
    )
);

gulp.task('default', gulp.series('dev'));