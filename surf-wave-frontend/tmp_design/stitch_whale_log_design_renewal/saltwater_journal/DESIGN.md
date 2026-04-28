# Design System Specification: The Curated Coastal Journal

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Curated Coastal Journal."** 

This system moves beyond the generic "utility app" aesthetic to create an experience that feels like a premium, hand-bound traveler’s log—a digital intersection of a vintage surf shop and a high-end Hobonichi planner. We are intentionally breaking the rigid, boxy nature of mobile UI by utilizing **intentional asymmetry, overlapping elements, and tonal depth.** 

The goal is tactile nostalgia. Elements should feel like hand-placed stickers or smooth sea glass resting on sun-bleached paper. We achieve "premium" not through complexity, but through the extreme intentionality of our whitespace and the rejection of standard "out-of-the-box" structural markers like dividers and hard borders.

---

## 2. Colors & Surface Logic
The palette is rooted in a "Golden Hour" spectrum. We use warm neutrals to anchor the experience and muted ocean tones to drive action.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts. For example, a navigation block should be defined by a shift from `surface` (#fff9ed) to `surface-container-low` (#f9f3e7). If a section needs emphasis, use a tonal transition, never a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine stationery.
*   **Base Layer:** `surface` (#fff9ed) – The primary canvas.
*   **Secondary Content:** `surface-container-low` (#f9f3e7) – Used for grouping secondary information.
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) – Used for high-priority items that need to "pop" off the warm sand background.
*   **Emphasis Layers:** `surface-container-high` (#ede8dc) – Used for inset elements or "depressed" states.

### The "Glass & Gradient" Rule
To elevate the "Whale Log" experience, use Glassmorphism for floating elements (e.g., sticky headers or FABs). Utilize semi-transparent versions of `surface` with a `20px` backdrop-blur. 
*   **Signature Gradients:** For primary CTAs, do not use flat colors. Use a subtle linear gradient from `primary` (#12647b) to `primary_container` (#367d95) at a 135-degree angle to mimic the depth of the ocean.

---

## 3. Typography
We use **Plus Jakarta Sans** for its sophisticated balance of geometric clarity and soft, approachable curves.

*   **Display & Headlines:** Use `ExtraBold` weights. These should feel like vintage surf posters—heavy, authoritative, but friendly. Use `display-lg` for hero moments to create a "sticker" impact.
*   **Titles:** Use `Bold` weight for `title-lg` and `title-md`. This provides the "editorial" structure required for a logbook.
*   **Body:** `body-lg` and `body-md` use `Medium` weights to ensure readability against the warm, low-contrast background.
*   **Labels:** Use `label-md` in `on_surface_variant` (#3f484c) with slightly increased letter spacing (+2%) to mimic the meticulous notes in a field guide.

---

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional structural shadows.

### The Layering Principle
Achieve a "lifted" look by stacking tokens. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural separation that feels high-end and organic.

### Ambient Shadows
When an element must float (e.g., a "Log Surf" button), use an **Ambient Shadow**:
*   **Blur:** 24px to 32px.
*   **Opacity:** 6% - 10%.
*   **Color:** Use a tinted version of `on_surface` (a deep navy tint) rather than black. This mimics natural sunlight hitting a surface.

### The "Ghost Border" Fallback
If accessibility requirements demand a border, use a **Ghost Border**. Apply the `outline-variant` (#bfc8cd) at a **15% opacity**. A 100% opaque border is a failure of the system’s organic philosophy.

---

## 5. Components

### Buttons
*   **Primary:** Rounded-full (`xl` / 3rem radius). Use the Ocean Gradient (`primary` to `primary_container`). Text is `on_primary`.
*   **Secondary:** Rounded-full. `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary (Accent):** Rounded-full. `tertiary` (#974311) background. Use this sparingly for "high-emotion" actions like "Spotting a Whale."

### Cards & Lists
*   **Radius:** Always `DEFAULT` (1rem/16px).
*   **Structure:** No divider lines. Separate list items using 12px of vertical white space or by alternating background tones between `surface` and `surface-container-low`.
*   **The "Sticker" Card:** For featured content, use a `surface-container-lowest` card with an ambient shadow and a 2-degree rotation to mimic a hand-placed sticker.

### Inputs & Selection
*   **Input Fields:** Use `surface-container-high` for the field background. The label should be `label-md` positioned above the field. 
*   **Chips:** Selection chips should use the `secondary_fixed` token. When selected, they transition to `tertiary_fixed` with a subtle `tertiary` icon.

### App-Specific: The "Log Entry" Component
A custom component designed like a planner entry. It uses a `surface-container-lowest` background, `headline-sm` for the date, and Lucide icons (rounded strokes) in `primary` to denote tide levels and weather.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical padding (e.g., more top padding than bottom) to create an editorial, rhythmic flow.
*   **Do** overlap images over card boundaries slightly to break the "grid" and enhance the scrapbook feel.
*   **Do** use "Sage Ocean Green" (`success`) for all positive data visualizations (e.g., "Perfect Conditions").

### Don't:
*   **Don't** use pure black (#000000) anywhere. Use `on_surface` (#1d1c14) for maximum depth without the harshness.
*   **Don't** use sharp 90-degree corners. Everything must feel smoothed by the tide.
*   **Don't** crowd the interface. If a screen feels "busy," increase the whitespace. The ocean is vast; the app should feel the same.
*   **Don't** use standard "Drop Shadows." If it looks like a default Figma effect, it’s wrong.