import seed from "./about-us.seed.json";
import { pageDocumentSchema, type PageSection, type SectionType, sectionNames } from "./page.schema";
export function createAboutUsDraft() { return pageDocumentSchema.parse(structuredClone(seed)); }
export function createSection(type: SectionType): PageSection {
    const base = createAboutUsDraft().sections.find(section => section.type === type)!;
    return { ...base, id: `${type}-${crypto.randomUUID().slice(0, 8)}`, label: sectionNames[type], visible: type !== "hero", verified: false, verifiedAt: "" };
}
