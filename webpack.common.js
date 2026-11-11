const fs = require("fs");
const path = require("path");

const entry = {};
fs.readdirSync("./src/client/pages").forEach(file => {
  if (file.endsWith(".tsx")) {
    entry[file.slice(0, -4)] = "./" + path.join("./src/client/pages", file);
  }
});

module.exports = {
  entry,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
					loader: "ts-loader",
          options: {
            compilerOptions: {
              skipLibCheck: true  // Skip type checking of declaration files
            },
            transpileOnly: true  // Skip all type checking (faster builds)
          }
				},
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
    },
		fallback: {
			crypto: false
		},
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "public/bundle"),
		clean: true
  },
};