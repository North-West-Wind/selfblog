const path = require("path");

module.exports = {
  entry: {
    main: "./src/client/index.tsx",
    list: "./src/client/pages/list.tsx",
    new: "./src/client/pages/new.tsx",
    edit: "./src/client/pages/edit.tsx",
    nav: "./src/client/pages/nav.tsx",
    "404": "./src/client/pages/404.tsx",
    delete: "./src/client/pages/delete.tsx",

    formatia: "./src/client/scripts/formatia.ts"
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
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",     // Must be below test-utils
      "react/jsx-runtime": "preact/jsx-runtime"
    }
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "public/bundle"),
  },
};