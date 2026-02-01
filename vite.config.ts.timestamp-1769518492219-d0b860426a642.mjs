// vite.config.ts
import { defineConfig } from "file:///D:/Max/skirmish/Skirmish-Sci-Fi/node_modules/.pnpm/vitest@2.1.9_@types+node@22_398d279e1c21f89102a25af039d4b779/node_modules/vitest/dist/config.js";
import react from "file:///D:/Max/skirmish/Skirmish-Sci-Fi/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__e67030eada3336304177bb533ccdeae5/node_modules/@vitejs/plugin-react/dist/index.js";
import { viteStaticCopy } from "file:///D:/Max/skirmish/Skirmish-Sci-Fi/node_modules/.pnpm/vite-plugin-static-copy@1.0_296d046467fc0d862f05ac59d6471c7e/node_modules/vite-plugin-static-copy/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { visualizer } from "file:///D:/Max/skirmish/Skirmish-Sci-Fi/node_modules/.pnpm/rollup-plugin-visualizer@5.14.0_rollup@4.56.0/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/Max/skirmish/Skirmish-Sci-Fi/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  base: "/",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "locales",
          dest: "."
        },
        {
          src: "assets",
          dest: "."
        },
        {
          src: "assets/portraits",
          dest: "assets"
        }
      ]
    }),
    visualizer({
      filename: "bundle-stats.html",
      open: false,
      // Changed to false to prevent opening on every run
      gzipSize: true,
      brotliSize: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxNYXhcXFxcc2tpcm1pc2hcXFxcU2tpcm1pc2gtU2NpLUZpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxNYXhcXFxcc2tpcm1pc2hcXFxcU2tpcm1pc2gtU2NpLUZpXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9NYXgvc2tpcm1pc2gvU2tpcm1pc2gtU2NpLUZpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHZpdGVTdGF0aWNDb3B5IH0gZnJvbSAndml0ZS1wbHVnaW4tc3RhdGljLWNvcHknO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xyXG5cclxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBiYXNlOiAnLycsXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIHZpdGVTdGF0aWNDb3B5KHtcclxuICAgICAgdGFyZ2V0czogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHNyYzogJ2xvY2FsZXMnLFxyXG4gICAgICAgICAgZGVzdDogJy4nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3JjOiAnYXNzZXRzJyxcclxuICAgICAgICAgIGRlc3Q6ICcuJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHNyYzogJ2Fzc2V0cy9wb3J0cmFpdHMnLFxyXG4gICAgICAgICAgZGVzdDogJ2Fzc2V0cycsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pLFxyXG4gICAgdmlzdWFsaXplcih7XHJcbiAgICAgIGZpbGVuYW1lOiAnYnVuZGxlLXN0YXRzLmh0bWwnLFxyXG4gICAgICBvcGVuOiBmYWxzZSwgLy8gQ2hhbmdlZCB0byBmYWxzZSB0byBwcmV2ZW50IG9wZW5pbmcgb24gZXZlcnkgcnVuXHJcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxyXG4gICAgICBicm90bGlTaXplOiB0cnVlLFxyXG4gICAgfSksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLycpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHRlc3Q6IHtcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgIHNldHVwRmlsZXM6IFsnLi92aXRlc3Quc2V0dXAudHMnXSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UixTQUFTLG9CQUFvQjtBQUNwVCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxzQkFBc0I7QUFDL0IsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsa0JBQWtCO0FBTGtKLElBQU0sMkNBQTJDO0FBTzlOLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsRUFDTixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixlQUFlO0FBQUEsTUFDYixTQUFTO0FBQUEsUUFDUDtBQUFBLFVBQ0UsS0FBSztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsVUFDRSxLQUFLO0FBQUEsVUFDTCxNQUFNO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsV0FBVztBQUFBLE1BQ1QsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsSUFDZCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxJQUFJO0FBQUEsSUFDbkM7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsbUJBQW1CO0FBQUEsRUFDbEM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
