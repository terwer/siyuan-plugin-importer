/// <reference types="vitest" />

import { resolve } from "path"
import { defineConfig, loadEnv } from "vite"
import minimist from "minimist"
import { viteStaticCopy } from "vite-plugin-static-copy"
import livereload from "rollup-plugin-livereload"
import { svelte } from "@sveltejs/vite-plugin-svelte"

const args = minimist(process.argv.slice(2))
const isWatch = args.watch || args.w
const devDistDir = "/Users/terwer/Documents/mydocs/SiYuanWorkspace/public/data/plugins/siyuan-importer"
const distDir = isWatch ? devDistDir : "./dist"
// const mode = process.env.NODE_ENV
const mode = isWatch ? "development" : "production"

const defineEnv = () => {
  const env = loadEnv(mode, process.cwd())
  return {
    "process.env": Object.entries(env).reduce((prev, [key, val]) => {
      return {
        ...prev,
        [key]: val,
      }
    }, {}),
  }
}
const env = {
  ...defineEnv(),
  // 下面可以自定义添加需要注入的环境变量
  "process.env.NODE_ENV": mode,
}

console.log("mode=>", mode)
console.log("env=>", env)
console.log("isWatch=>", isWatch)
console.log("distDir=>", distDir)

export default defineConfig({
  plugins: [
    svelte(),

    viteStaticCopy({
      targets: [
        {
          src: "./README*.md",
          dest: "./",
        },
      ],
    }),
  ],

  // https://github.com/vitejs/vite/issues/1930
  // https://vitejs.dev/guide/env-and-mode.html#env-files
  // 在这里自定义变量
  define: env,

  build: {
    // 输出路径
    outDir: distDir,
    emptyOutDir: false,

    // 构建后是否生成 source map 文件
    sourcemap: false,

    // 设置为 false 可以禁用最小化混淆
    // 或是用来指定是应用哪种混淆器
    // boolean | 'terser' | 'esbuild'
    // 不压缩，用于调试
    minify: isWatch,

    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.ts"),
      // the proper extensions will be added
      fileName: "index",
      formats: ["cjs"],
    },
    rollupOptions: {
      plugins: [...(isWatch ? [livereload(devDistDir)] : [])] as Plugin[],

      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["siyuan", "process"],

      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
})
