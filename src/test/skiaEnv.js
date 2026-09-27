/* Node test environment with CanvasKit loaded, so Skia drawings can render in the screen smoke tests. */
const { TestEnvironment } = require('jest-environment-node');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');
class SkiaEnvironment extends TestEnvironment {
  async setup() { await super.setup(); this.global.CanvasKit = await CanvasKitInit({}); }
}
module.exports = SkiaEnvironment;
