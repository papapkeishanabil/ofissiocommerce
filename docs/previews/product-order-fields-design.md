# Product order fields — local design record

Completed local redesign of the quantity, size-guide, and optional order-note fields in the product purchase panel. This is a surface-specific record, not a change to the Ofissio design system. Status: verified locally; not deployed.

## Overview

Preserve Ofissio navy while giving order entry a clearer visual hierarchy: a blue-tinted quantity panel, a navy total, an obvious size-guide action, and a labeled note field. The emphasized quantity appearance is explicitly enabled by `ProductDetail`; `SizeQuantityMatrix` defaults to its existing appearance, including in the shared studio.

## Colors

Ofissio navy (`#142766`) anchors headings, selected borders, focus outlines, the total strip, and the guide icon. Pale blue (`#f1f5fc`) groups quantity entry and the guide; selected size cards use a stronger tint (`#e7eefc`). White cards and muted blue-gray supporting text keep inputs distinct. MOQ feedback uses text and icons with mint success or amber warning accents against navy.

## Layout

The quantity grid fits three columns where the purchase panel has room and two on the verified mobile layouts. At widths up to 380 px, two columns are explicit and padding tightens to preserve three-digit input visibility. Quantity values remain prominent at 20 px, with a 30 px total. The size-guide button spans the panel and has a minimum height of 76 px. Notes follow in a separate white panel with a vertically resizable textarea.

## Shapes

The quantity panel has softly rounded corners (16 px); the guide and notes use 12 px corners, size cards 10 px, and controls 8 px. Borders and tonal backgrounds establish grouping. Keyboard focus uses visible navy outlines.

## Components

- **Quantity:** Each size retains its measurements, minus/input/plus controls, and stock status. A positive quantity adds a check icon, navy border, and selected tint. The navy footer presents the live sum and empty, below-MOQ, or ready feedback. Existing stock, pricing, and MOQ behavior is retained, including embroidery minimums.
- **Size guide:** A prominent ruler icon, action label, helper text, and chevron identify the expandable chart. The button exposes its expanded state and controlled content. Existing chart availability rules remain in place.
- **Order notes:** “Catatan pesanan” is a persistent label with an “Opsional” marker, helper copy, and example placeholder. The textarea permits 120 characters and displays the current count; its accessible description includes the help and count. It remains in the existing plain-note branch of the product flow.

## Completed verification

The implementation was checked at viewport widths of 1440, 390, and 320 px, including three-digit quantities (`120` and `999`), quantity summation, stock status, note entry, and chart expansion. The finish reviewer marked the three prior findings resolved (3/3). This record adds no new review or test run.

Screenshot evidence:

- [Desktop quantity panel — 1440 px](../../artifacts/order-fields-redesign/quantity-1440.png)
- [Narrow quantity panel — 320 px](../../artifacts/order-fields-redesign/quantity-320.png)
- [Collapsed size guide — 390 px](../../artifacts/order-fields-redesign/guide-closed-390.png)
- [Optional notes — 390 px](../../artifacts/order-fields-redesign/notes-390.png)

Implementation references: [scoped field styles](../../src/components/product/ProductOrderFields.module.css), [quantity component](../../src/components/product/SizeQuantityMatrix.tsx), and [product detail integration](../../src/components/product/ProductDetail.tsx).
