/** @type {import("rollup").RollupOptions} */
import { fileURLToPath } from "node:url";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import tsconfigPaths from "rollup-plugin-tsconfig-paths";
import commonjs from "@rollup/plugin-commonjs";
import polyfillNode from "rollup-plugin-polyfill-node";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/esm.js",
      format: "esm",
      globals: {
        tslib: "tslib",
        "node:crypto": "crypto", // 映射到浏览器全局变量
      },
    },
    {
      file: "dist/cjs.js",
      format: "cjs",
      globals: {
        tslib: "tslib",
        "node:crypto": "crypto", // 映射到浏览器全局变量
      },
    },
    {
      file: "dist/umd.js",
      name: "river",
      format: "umd",
      globals: {
        tslib: "tslib",
        "node:crypto": "crypto", // 映射到浏览器全局变量
      },
    },
  ],
  plugins: [
    nodeResolve({
      browser: true, // 强制浏览器解析模式
      preferBuiltins: false, // 禁用 Node.js 内置模块
    }),
    resolve(),
    json(),
    commonjs(),
    polyfillNode({ crypto: true, exclude: ["window"] }),
    tsconfigPaths({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
    }),
    alias({
      entries: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "src"),
          customResolver: (id) => id.replace("@/", ""),
        },
      ],
    }),
    typescript({
      tsconfig: "tsconfig.json",
    }),
  ],
  external: ["tslib"],
};
