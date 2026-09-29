import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

const watch = process.argv.includes("--watch");
mkdirSync("dist", { recursive: true });
cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup.html", "dist/popup.html");

const ctx = await esbuild.context({
  entryPoints: { content: "src/content.ts", background: "src/background.ts", popup: "src/popup.ts" },
  bundle: true,
  outdir: "dist",
  format: "esm",
  target: "chrome120",
  sourcemap: true,
});
if (watch) await ctx.watch(); else { await ctx.rebuild(); await ctx.dispose(); }
