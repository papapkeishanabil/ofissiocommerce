import assert from "node:assert/strict";

import { DEFAULT_BORDIR, DEFAULT_HERO, heroSectionSchema } from "../src/features/site-content/content.schema";
import {
  isAllowedSiteVideoKey,
  isProbablyMp4,
  isProbablyWebm,
} from "../src/features/site-content/site-content-video.service";

const uuid = "123e4567-e89b-12d3-a456-426614174000";
assert.equal(isAllowedSiteVideoKey(`site-content/hero/${uuid}-hero.mp4`), true);
assert.equal(isAllowedSiteVideoKey(`site-content/bordir/${uuid}-produksi.webm`), true);
assert.equal(isAllowedSiteVideoKey(`site-content/hero/../../secret.mp4`), false);
assert.equal(isAllowedSiteVideoKey(`site-content/footer/${uuid}-video.mp4`), false);

assert.equal(isProbablyMp4(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109])), true);
assert.equal(isProbablyMp4(new Uint8Array([0, 0, 0, 0, 110, 111, 112, 101])), false);
assert.equal(isProbablyWebm(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])), true);
assert.equal(isProbablyWebm(new Uint8Array([0, 1, 2, 3])), false);

const legacyHero = { slides: structuredClone(DEFAULT_HERO.slides) };
assert.equal(heroSectionSchema.parse(legacyHero).videoSrc, "/hero-workers.mp4");
assert.equal(DEFAULT_BORDIR.mediaSrc, "/KK-006.mp4");

console.log("PASS: site-content video validation, legacy fallback, and storage allowlist");
