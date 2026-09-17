import { TextureLoader } from "three";
import type { GLTFLoader, GLTFParser } from "three-stdlib";

function browserImageTextures(parser: GLTFParser) {
  // Decode embedded JPEG/PNG blobs through HTMLImageElement. This avoids the
  // ImageBitmap fetch/decode path for Studio textures while retaining their
  // original resolution. GLTFLoader still sets flipY, color space and samplers.
  return {
    name: "OFISSIO_browser_image_textures",
    beforeRoot() {
      parser.textureLoader = new TextureLoader(parser.options.manager)
        .setCrossOrigin(parser.options.crossOrigin)
        .setRequestHeader(parser.options.requestHeader);
      return null;
    },
  };
}

export function configureStudioGLTFLoader(loader: GLTFLoader) {
  loader.register(browserImageTextures);
}
