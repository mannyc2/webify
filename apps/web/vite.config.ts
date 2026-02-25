import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

// Polyfill WeakRef/FinalizationRegistry for workerd dev sandbox where
// react-server-dom-webpack's edge client requires them.
function workerdGlobalsPolyfill(): Plugin {
  return {
    name: "workerd-globals-polyfill",
    transform(code, id) {
      if (
        id.includes("react-server-dom-webpack") &&
        id.includes(".edge.")
      ) {
        const shim = [
          `if(typeof globalThis.WeakRef==="undefined"){`,
          `globalThis.WeakRef=class{constructor(t){this._t=t}deref(){return this._t}};`,
          `}`,
          `if(typeof globalThis.FinalizationRegistry==="undefined"){`,
          `globalThis.FinalizationRegistry=class{constructor(){}register(){}unregister(){}};`,
          `}`,
        ].join("");
        return { code: shim + code, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    workerdGlobalsPolyfill(),
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      remoteBindings: true,
    }),
  ],
  build: {
    rollupOptions: {
      external: [/^cloudflare:/],
    },
  },
});
