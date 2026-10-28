# shadcn registry components

Installed from the official shadcn registry with CLI 4.23.0, using the existing `base-nova` style:

```sh
npx shadcn@latest add button card input input-group tabs select sheet badge separator scroll-area empty alert avatar -y --overwrite
```

The generated files in `components/ui/` are used directly without edits. `textarea` was installed automatically as a dependency of Input Group.

| Interface | Registry component |
| --- | --- |
| Product tiles and cart items | Card |
| Search field | Input Group + Input |
| Category navigation | Tabs |
| Variant dropdowns | Select |
| Cart drawer, overlay, focus management, Escape handling | Sheet |
| Quantity field | Input |
| All actions and supplier links | Button |
| Supplier icons | Avatar |
| Cart count | Badge |
| Dividers | Separator |
| Horizontal navigation and cart scrolling | Scroll Area |
| Empty catalog and cart | Empty |
| Catalog loading errors | Alert |

`style.css` contains the registry theme tokens and base imports only, with the background token set to black. There are no custom component selectors or hand-written keyframes. Layout uses Tailwind utilities; add confirmation uses the registry Button variants and the installed `tw-animate-css` utility. Product data, cart state, exports, and component composition are application logic in `src.jsx`.
