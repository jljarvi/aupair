import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  external: ["vscode"], // ✅ This tells esbuild NOT to bundle vscode
}).catch(() => process.exit(1));
