# V5 Supply

Independent V5RC parts ordering hub. React + Vite; AMOLED theme; persistent variant cart; CSV and XLSX exports matching the provided team order columns, plus names, variants and line totals. Exports are purchase lists, not submitted purchases. Prices are USD, excluding tax/shipping.

## Run

```sh
npm ci --cache /tmp/npm-cache
npm run dev -- --host 0.0.0.0
npm run build
```

## Import real catalog

```sh
npm run scrape
```

Requires HTTPS access to www.whimsytech.net and Shopify image hosts. Importer paginates the Shopify collection JSON, selects requested product families, retains every returned variant (including unavailable ones), preserves supplier SKUs/prices, and downloads variant and gallery images. It fails without replacing the catalog on network or image errors. Review product coverage and missing SKU count after import; the site disables unavailable stock and exports supplier variant IDs alongside SKUs. New supplier naming may require adjusting patterns in scripts/scrape.mjs. The catalog contains 31 products and 211 variants. Supplier data has no SKUs for six Black Nylon Hex Standoffs and seven Green Nylon Washers & Spacers variants; these are exported with blank SKU and the supplier variant ID. Three products have no supplier images (White Nylon Washers & Spacers, Green Nylon Washers & Spacers, and T15 Flat Head Screws 0.18 inch Shoulder); the UI labels these gaps. All other supplied images are downloaded locally.

Cart is stored in localStorage. Exports neutralize spreadsheet formula prefixes. No payment or supplier checkout is performed.

## Minimal catalog update

The interface now uses actual shadcn (base-nova) Button components installed with `npx shadcn@latest init -d -y` and `npx shadcn@latest add button -y --overwrite`, Tailwind v4, black backgrounds, and neutral controls. Whimsy-style availability/price filters sit beside supplier/color filters and sorting; top tabs separate screws and shoulder screws. Supplier logos are local assets.

Robosource import: install `beautifulsoup4` in your Python environment, then run `python scripts/scrape-robosource.py`. Requires curl. It follows all listing pages, deduplicates overlapping categories, validates reference numbers/photos, and preserves Whimsy products. Current coverage is 47 unique products, including 18 shoulder-screw listings; all references and photos were found. Existing Whimsy missing SKU/photo limitations still apply.

Deploy to GitHub Pages with `npm run build` and publish dist contents plus `.nojekyll` to the existing gh-pages branch.

## Catalog scope and transparent photos

Whimsy locking screws are excluded by the importer; aluminum, nylon, and non-locking shoulder screws remain. Robosource now also imports matching screws/nuts from every page of `/nylon-screws-nuts` (currently Nylon Hex Nut, 100 Pack, reference 30-01, and Nylon Screw 8-32 × 0.500 inch, 100 Pack; see catalog for supplier references/prices).

After either supplier import, run `npm run images:transparent` before building or committing. This uses the `sharp` npm package to turn edge-connected near-white backgrounds into alpha-transparent PNGs, keeping the original image files. It preserves existing transparency and internal white product details. Robosource's isolated image-header text is cropped because size/reference information is displayed in the product card. Generated PNGs live in `public/images/transparent/`; catalog URLs are updated automatically. Review pale parts against the dark UI after importing new photos. Repeating the command does not reprocess the already transparent catalog images.

## Latest simplified UI

Only search and category tabs remain above the catalog. The filter/sort row, product count, and visible SKU/reference labels are removed; identifiers remain in exported orders. Single-variant products no longer show a redundant dropdown. Add-to-cart buttons briefly show an animated check and “Added to cart” after the quantity is updated, with reduced-motion support.

Supplier badges use the actual favicon assets (Whimsy 256px PNG; Robosource multi-resolution ICO up to 64px). Aluminum Spacers & Collars is explicitly fetched from Whimsy's product endpoint during refresh, including both actual variants, prices, stock, and variant images; the supplier does not publish SKUs for these two variants. To refresh only this extra product without fetching the collection, run `node --use-env-proxy scripts/scrape.mjs --extras-only`, then `npm run images:transparent`.

## Registry UI migration

All controls now come directly from the official shadcn registry (`base-nova`), including cards, variant selects, category tabs, search input, supplier avatars, and the cart sheet. The previous custom component CSS was removed. See [REGISTRY.md](REGISTRY.md) for the exact installation command and component mapping.

## Editable spreadsheet export and VEX/HCU catalogs

Order review now opens an editable shadcn Dialog/Table preview before downloads. Part names, links, supplier, reference, quantity, quantity needed, unit price and variant are editable for the export. Quantity × price totals are calculated. Exports follow the original uploaded order sheet's title/header layout, with extra variant, total and source-URL columns. Split mode creates supplier tabs in XLSX or supplier CSVs inside a ZIP. Cart deletion uses an accessible trash-icon button.

The initial screen presents centered search and categories; no catalog cards render until searching or selecting a category. Electronics, Metal, Wheels and Motion were added. Existing lazy loading remains.

`PYTHONPATH=<beautifulsoup4 install location> python scripts/scrape-vex.py` imports the requested VEX pages. It uses the public Magento GraphQL US catalog for USD prices, grouped children and custom option SKUs; HTML supplies product images and option mappings. It distinguishes 6P and 9P sprockets, omits the hardware kit/crimper/rack gear/gear kits/general gusset assortment, and limits aluminum angle to 1x1x35. Product 276-7285 is the U-channel, and 276-8659 is AI Vision (the duplicate vision link is imported once).

Source limitations: VEX does not publish a usable option photo for legacy 4-inch wheel 276-1497; its card uses a labeled placeholder. Compression wheel 276-8880 appears on the EU page but is absent from the US response, so its USD price is blank and ordering is disabled. HCU's public product API exposes actual SKUs N-B-100 ($25/100) and N-S-100 ($20/100); these are retained despite the original request expecting no number. HCU's own logo is displayed inverted. VEX's actual favicon is downloaded locally.

## Full-resolution photos and shadow removal

VEX imports now prefer the image viewer's `full` URL over `url`/thumbnail fields and use original catalog images instead of resized cache URLs. `sourceImageUrl` records the fetched source. The 2-inch omni photo is now 1200×1200 (the prior selection was 70×70).

`npm run images:transparent` uses `@imgly/background-removal-node`'s medium segmentation model for white-background product photos, removing cast shadows as well as the white backdrop. Robosource's multi-view technical renders retain the conservative edge matte so small profile views are preserved. Supplier originals remain unchanged. Outputs are content-hashed PNGs under `public/images/cutouts-v2/`, cached across runs; the catalog is updated after processing finishes. Existing supplier transparency is preserved. Review generated cutouts against a dark background after an import.

The image processor is a development-only dependency and is not loaded by the website. `.npmrc` selects ONNX Runtime's supported CPU-only installation mode; no CUDA download is needed. Image processing can take several minutes for a fresh catalog.

A refinement pass preserves small dark fasteners which segmentation can otherwise soften in kit photos. Saved carts refresh only their image URLs from the current catalog, so old cart items receive regenerated photos without changing their saved quantities or prices.

## Product families

`catalog-groups.js` groups the imported catalog for display on load: Robosource star-drive and shoulder screws (regular/color-coded families, including variety packs), VEX 6P sprockets, VEX 9P sprockets, and VEX gears/pinions. Whimsy's existing families remain intact. Every variant retains its original ID, SKU, price, image, availability, product name and supplier URL. The selected variant's original product name and URL are used in cart exports. Supplier imports remain raw, so grouping also applies after future catalog refreshes.

Family grouping also covers Whimsy aluminum standoffs and nylon washers/spacers across colors, VEX omni/traction wheels, 11W motors/cartridges, smart cables/accessories, C-channels, gussets, high-strength shafts, shaft adapters, capped shafts and standard drive shafts. Different suppliers, nylon versus aluminum standoffs, acetal versus nylon spacers, and 5.5W versus 11W motors stay distinct. The current 166 imported listings display as 66 family cards without dropping variants.

Compression-wheel listings remain individual cards. Group keys include the supplier identity, and standoffs and spacers remain separate families.

## Minimal V5 Parts layout

The page title and brand are V5 Parts, with a monochrome hex-nut SVG favicon. The centered start screen has no divider bars. Its search field stays mounted while native View Transitions move it into the browsing header, preserving typing focus; reduced-motion preferences are respected. Shoulders share the Screws category. Desktop supplier filters live in the side column; mobile category/supplier navigation uses a registry Sheet. The order sheet uses compact flat rows, supplier labels, quantity controls, and trash actions instead of nested cards. The motor family defaults to the 11W motor and its image. AMOLED background, card, popover and sidebar colors are applied through theme tokens.

Compression Wheels has its own navigation category on desktop and mobile. All seven compression-wheel listings appear there individually; general Wheels contains the other wheel types.

## Custom domain deployment

Production is served from `https://v5parts.t3rm1n4l.dev/`. Build with `npm run build`; Vite explicitly uses `./` as its base so bundled assets, data and photos resolve relative to the document. Do not pass the old repository-path base. `public/CNAME` is copied into the deployment output. Before publishing, read the current GitHub Pages custom-domain setting and preserve its CNAME, including changes made directly on gh-pages. Verify the live HTML, JS, CSS, fonts, catalog, favicon, supplier logos and product images from the custom domain after deployment.

Publish with `python scripts/deploy-pages.py` after building. The deployer reads the current Pages configuration and preserves the user's CNAME before replacing build artifacts. It rejects the old repository-prefixed HTML build.
