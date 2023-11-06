const path = require("path");

module.exports = {
  entry: {
    main: "./client/index.tsx",
    list: "./client/pages/list.tsx",
    new: "./client/pages/new.tsx",
    edit: "./client/pages/edit.tsx",
    nav: "./client/pages/nav.tsx",
    "404": "./client/pages/404.tsx"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      }
    ],
  },
  mode: "development",
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "public/bundle"),
  },
  devtool: 'cheap-module-source-map',
  optimization: {
    minimize: false
  }
};