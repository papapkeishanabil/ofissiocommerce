import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, Building2, Coffee, Cross, Factory, Store, Utensils, WashingMachine, Wrench } from "lucide-react";
import type { PageDocument, PageImage, PageSection } from "./page.schema";
import styles from "./PageRenderer.module.css";
import { publicPageImageAlt } from "./about-us.seo";
const industryIcons = [WashingMachine, Cross, Wrench, Store, Coffee, Utensils, Building2, Factory];
// These exact store assets were confirmed as real photos by the owner.
// Existing published CMS snapshots may still carry their old illustration flag.
const confirmedStorePhotos = new Set([
    "/about-us/store-exterior-selected.png",
    "/about-us/store-showroom-illustration.png",
    "/about-us/store-interior-selected.png",
]);
function Photo({ image, hero = false, previewDevice }: {
    image: PageImage;
    hero?: boolean;
    previewDevice?: "desktop" | "mobile";
}) {
    image = { ...image, alt: publicPageImageAlt(image.alt) };
    const d = image.desktop, m = image.mobile, crop = image.referenceCrop;
    const style = { "--ratio": d.ratio, "--mobile-ratio": m.ratio, "--focus": `${d.x}% ${d.y}%`, "--mobile-focus": `${m.x}% ${m.y}%`, "--fit": d.fit, "--mobile-fit": m.fit } as CSSProperties;
    return <figure className={styles.photo} style={style}>
  <div className={`${styles.image} ${image.mobileSrc ? styles.hasMobile : ""}`}>
   {crop ? <><div role="img" aria-label={image.alt} className={styles.reference} style={{ backgroundImage: `url("${image.src}")`, backgroundSize: `${crop.sourceWidth / crop.width * 100}% ${crop.sourceHeight / crop.height * 100}%`, backgroundPosition: `${crop.x / (crop.sourceWidth - crop.width) * 100}% ${crop.y / (crop.sourceHeight - crop.height) * 100}%` }}/>{image.mobileSrc && <Image unoptimized fill className={styles.mobileOverride} src={image.mobileSrc} alt={image.alt} loading="lazy"/>}</> : <picture><source media={previewDevice === "mobile" ? "all" : previewDevice === "desktop" ? "not all" : "(max-width:850px)"} srcSet={image.mobileSrc || image.src}/><img src={image.src} alt={image.alt} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"}/></picture>}
   {image.status === "illustration" && !confirmedStorePhotos.has(image.src) && <span className={styles.illustration}>Ilustrasi</span>}
  </div>
  {image.caption && <figcaption>{image.caption}</figcaption>}
 </figure>;
}
function Copy({ section, index }: {
    section: PageSection;
    index: number;
}) {
    const Tag = section.type === "hero" ? "h1" : "h2";
    return <div className={styles.copy}>
  <div className={styles.marker}>{section.type !== "story" && <><span>{String(index).padStart(2, "0")}</span><i /></>}{section.label}</div>
  <Tag>{section.title} {section.accent && <span>{section.accent}</span>}</Tag>
  <div className={styles.paragraphs}>{section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
  {section.buttons.length > 0 && <div className={styles.actions}>{section.buttons.map((button, i) => <a key={i} href={button.href} className={i ? styles.secondary : styles.primary}>{button.label}{i === 0 && <ArrowRight size={17} aria-hidden/>}</a>)}</div>}
 </div>;
}
export function PageSectionView({ section, index = 1, previewDevice }: {
    section: PageSection;
    index?: number;
    previewDevice?: "desktop" | "mobile";
}) {
    const style = { background: section.background, color: section.foreground, "--hero-ratio": section.images[0]?.desktop.ratio ?? 2.4, "--surface": section.background, "--accent": section.accentColor, "--pad": `${section.desktop.padding}px`, "--mobile-pad": `${section.mobile.padding}px`, "--gap": `${section.desktop.gap}px`, "--mobile-gap": `${section.mobile.gap}px`, "--align": section.desktop.align, "--mobile-align": section.mobile.align } as CSSProperties;
    const className = [styles.section, styles[section.type], styles[section.layout], section.desktop.reverse ? styles.reverse : "", section.mobile.reverse ? styles.mobileReverse : ""].join(" ");
    return <section id={section.id} className={className} style={style} data-page-section={section.id}>
  <div className={styles.container}>
   <Copy section={section} index={index}/>
   {section.type === "story" ? <div className={styles.industries}><h3>{section.panelTitle}</h3><ul>{section.items.map((name, i) => { const Icon = industryIcons[i % industryIcons.length]!; return <li key={i}><Icon size={34} strokeWidth={1.4} aria-hidden/><span>{name}</span></li>; })}</ul><p>{section.panelDescription}</p></div> : <div className={styles.gallery}>{section.images.map((image, i) => <Photo key={image.id} image={image} hero={section.type === "hero" && i === 0} previewDevice={previewDevice}/>)}</div>}
  </div>
 </section>;
}
export function PageRenderer({ document, previewDevice }: {
    document: PageDocument;
    previewDevice?: "desktop" | "mobile";
}) {
    let index = 0;
    return <article className={styles.page}>{document.sections.filter(s => s.visible).map(section => { if (section.type !== "story")
        index++; return <PageSectionView key={section.id} section={section} index={index} previewDevice={previewDevice}/>; })}</article>;
}
