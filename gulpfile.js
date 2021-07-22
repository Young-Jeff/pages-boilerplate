// 实现这个项目的构建任务
const { src, dest, parallel, series, watch } = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const del = require("del");
const plugins = require("gulp-load-plugins")();
const browserSync = require("browser-sync").create();

const data = {
  menus: [
    {
      name: "Home",
      icon: "aperture",
      link: "index.html",
    },
    {
      name: "Features",
      link: "features.html",
    },
    {
      name: "About",
      link: "about.html",
    },
  ],
  pkg: require("./package.json"),
  date: new Date(),
};

const clean = () => {
  return del(["dist", "temp"]);
};

const style = () => {
  return src("src/assets/styles/*.scss", { base: "src" })
    .pipe(sass())
    .pipe(dest("temp"));
};

const script = () => {
  return src("src/assets/scripts/*.js", { base: "src" })
    .pipe(
      plugins.babel({
        presets: ["@babel/env"],
      })
    )
    .pipe(dest("temp"));
};
const page = () => {
  return src("src/*.html", { base: "src" })
    .pipe(
      plugins.swig({
        data,
        defaults: { cache: false },
      })
    )
    .pipe(dest("temp"));
};
const image = () => {
  return src("src/assets/images/**", { base: "src" })
    .pipe(plugins.imagemin())
    .pipe(dest("dist"));
};
const font = () => {
  return src("src/assets/fonts/**", { base: "src" })
    .pipe(plugins.imagemin())
    .pipe(dest("dist"));
};
const extra = () => {
  return src("public/**", { base: "public" }).pipe(dest("dist"));
};

const serve = () => {
  watch("src/assets/styles/*.scss", script);
  watch("src/assets/scripts/*.js", script);
  watch("src/*.html", page);
  // 想要监听public或者imgags变化，可以利用browserSync提供的reload方法
  // 该 reload 方法会通知所有的浏览器相关文件被改动，要么导致浏览器刷新，要么注入文件，实时更新改动。
  watch(
    ["src/assets/images/**", "src/assets/fonts/**", "public/**"],
    browserSync.reload()
  );
  browserSync.init({
    files: "dist/**", //files指定文件，监听到变化就自动刷新（注：此配置只会监听dist目录，而src不会，因为src修改后需要重新编译，下面会处理）
    server: {
      baseDir: ["temp", "src", "public"], //多个基目录，在dist目录下找不到就去src找，否则就去public找，以此类推
      routes: {
        "/node_modules": "node_modules", //通过映射，获取node_modules下的引用
      },
    },
  });
};
const useref = () => {
  // 为啥不是src下的文件呢，因为src下的html是模版，没有意义，必须得是生成后的dist目录才有意义
  return (
    src("temp/*.html", { base: "temp" })
      .pipe(plugins.useref({ searchPath: ["temp", "."] }))
      // html js css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true, //压缩html的空白行
            minifyCSS: true, //压缩html中的css
            minifyJS: true, //压缩html中的js
          })
        )
      )
      .pipe(dest("dist")) //因为放到dist目录，可能导致读写冲突，所以临时写一个目录
  );
};
const compile = parallel(style, script, page);
// 上线之前执行的任务
// 因为useref依赖compile任务，所以两者同步组合，然后和其他任务异步组合
const build = series(
  clean,
  parallel(series(compile, useref), extra, image, font)
);
// 开发阶段执行的任务
const develop = series(compile, serve);
module.exports = {
  build,
  clean,
  develop,
};
