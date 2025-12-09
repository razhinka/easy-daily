import esbuild from "esbuild";
import process from "process";

const isProduction = process.argv.includes("--production");

esbuild.build({
  entryPoints: ["main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  outfile: "main.js",
  minify: isProduction,
  sourcemap: !isProduction,
  external: ["obsidian"]
}).catch(() => process.exit(1));