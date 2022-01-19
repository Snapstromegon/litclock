import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

const config = {
  input: "./demo/main.ts",
  output: {
    dir: "rollup",
    format: "es",
  },
  plugins: [typescript(/*{ plugin options }*/), resolve(), terser()],
};

if (process.env.NODE_ENV !== "development") {
  config.plugins.push(terser());
}

export default config;
