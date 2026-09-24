<!-- DESIGN_SYSTEM_RULES_START -->
# Nihongo Quest UI Design Rules

Follow the guidelines from `DESIGN.md` unconditionally when creating or modifying any UI component:

1. **NO CSS Gradients**:
   - Never use `bg-gradient-to-*` or radial gradients on containers, cards, headers, or scorecards.
   - Always use solid surface tier classes: `bg-surface-base`, `bg-surface-card`, `bg-surface-inset`, `bg-surface-elevated`.

2. **NO Colored Outlines / Borders**:
   - Never use colored border classes on cards (e.g. `border-2 border-amber-500/30`, `border-crimson/50`, `border-teal/40`, `ring-*`).
   - Always use standard skeuomorphic borders: `border border-border-subtle` or `border border-border-primary`.

3. **NO Glow / Blur Blobs**:
   - Never add decorative colored blur circles (e.g. `<div className="blur-2xl bg-amber-500/10 rounded-full" />`).
   - Use tactile skeuomorphic shadows (`shadow-sm`, `shadow-md`, `shadow-inner`).

4. **NO Marketing / Buzzword Copy**:
   - Never write words like "medsos", "viral", "salin format medsos", or hashtags (`#NihongoQuest`).
   - Use immersive, clean in-game terms: "Main Lagi", "Pilih Level Lain", "Kembali ke Arena", "Arena Arcade", "Survival 3 Nyawa".

5. **Simple Skeuomorphism**:
   - Use tactile buttons: `.btn-physical-primary`, `.btn-physical-secondary`, `.btn-secondary`.
   - Use tactile panels: `.panel`, `.notebook-adventure-card`.
   - Accent colors (gold, crimson, teal, matcha, indigo) belong ONLY on small icons, numbers, or stamps, never leaking as card outlines or gradient backgrounds.
<!-- DESIGN_SYSTEM_RULES_END -->
