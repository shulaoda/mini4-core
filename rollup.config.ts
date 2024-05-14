import ts from "rollup-plugin-ts";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import externals from "rollup-plugin-node-externals";
import { defineConfig } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";

import type { RollupOptions } from "rollup";

const baseConfig: RollupOptions = {
  input: "src/index.ts",
  output: {
    sourcemap: true,
    exports: "named",
  },
  plugins: [
    externals({
      deps: true,
      devDeps: false,
    }),
    nodeResolve({
      preferBuiltins: false,
    }),
    ts({
      tsconfig: (e) => ({
        ...e,
        sourceMap: true,
      }),
    }),
    commonjs({
      extensions: [".js", ".ts"],
    }),
    babel({
      babelHelpers: "runtime",
    }),
  ],
};

const variesConfig: RollupOptions[] = [
  {
    output: {
      dir: "dist",
      preserveModules: true,
      preserveModulesRoot: "src",
    },
  },
  {
    output: {
      file: "dist/index.cjs.js",
      format: "cjs",
      inlineDynamicImports: true,
    },
  },
  {
    output: {
      format: "es",
      file: "dist/index.esm.js",
      inlineDynamicImports: true,
    },
  },
];

export default defineConfig(
  variesConfig.map((v) => {
    return Object.assign({}, baseConfig, v);
  })
);
