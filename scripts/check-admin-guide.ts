import { ADMIN_DETAILED_PROCEDURES, ADMIN_MENU_GUIDES } from "../src/features/admin-guide/admin-guide.data";
import { ADMIN_NAV_ITEMS } from "../src/features/admin/admin.config";

const menuHrefs = new Set(ADMIN_NAV_ITEMS.map((item) => item.href));
const guideHrefs = new Set(ADMIN_MENU_GUIDES.map((guide) => guide.href));
const missing = [...menuHrefs].filter((href) => !guideHrefs.has(href));
const duplicates = ADMIN_MENU_GUIDES.map((guide) => guide.href).filter((href, index, all) => all.indexOf(href) !== index);
const incomplete = ADMIN_MENU_GUIDES.filter((guide) => !guide.purpose.trim() || !guide.when.trim() || guide.steps.length < 2).map((guide) => guide.href);
const detailedHrefs = new Set(ADMIN_DETAILED_PROCEDURES.map((guide) => guide.href));
const missingDetailed = [...menuHrefs].filter((href) => !detailedHrefs.has(href));
const incompleteDetailed = ADMIN_DETAILED_PROCEDURES.filter((guide) => guide.prerequisites.length < 1 || guide.procedure.length < 2 || guide.procedure.some((stage) => stage.actions.length < 1 || !stage.expected.trim()) || guide.verification.length < 1 || guide.troubleshooting.length < 1).map((guide) => guide.href);

console.log("Ofissio admin guide check");
console.log("-------------------------");

if (missing.length || duplicates.length || incomplete.length || missingDetailed.length || incompleteDetailed.length) {
  if (missing.length) console.error(`FAIL: Menu tanpa panduan: ${missing.join(", ")}`);
  if (duplicates.length) console.error(`FAIL: Entri panduan ganda: ${[...new Set(duplicates)].join(", ")}`);
  if (incomplete.length) console.error(`FAIL: Panduan belum lengkap: ${incomplete.join(", ")}`);
  if (missingDetailed.length) console.error(`FAIL: Menu tanpa SOP terperinci: ${missingDetailed.join(", ")}`);
  if (incompleteDetailed.length) console.error(`FAIL: SOP terperinci belum lengkap: ${incompleteDetailed.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${menuHrefs.size} menu admin memiliki panduan lengkap.`);
  console.log("PASS: Tidak ada href panduan ganda.");
  console.log(`PASS: ${detailedHrefs.size} menu memiliki prasyarat, tahap, hasil, verifikasi, dan troubleshooting.`);
}
