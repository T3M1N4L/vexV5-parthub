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

Deploy to GitHub Pages with `npm run build -- --base=/vexV5-parthub/` and publish dist contents plus `.nojekyll` to the existing gh-pages branch.

## Catalog scope and transparent photos

Whimsy locking screws are excluded by the importer; aluminum, nylon, and non-locking shoulder screws remain. Robosource now also imports matching screws/nuts from every page of `/nylon-screws-nuts` (currently Nylon Hex Nut, 100 Pack, reference 30-01, and Nylon Screw 8-32 × 0.500 inch, 100 Pack; see catalog for supplier references/prices).

After either supplier import, run `npm run images:transparent` before building or committing. This uses the `sharp` npm package to turn edge-connected near-white backgrounds into alpha-transparent PNGs, keeping the original image files. It preserves existing transparency and internal white product details. Robosource's isolated image-header text is cropped because size/reference information is displayed in the product card. Generated PNGs live in `public/images/transparent/`; catalog URLs are updated automatically. Review pale parts against the dark UI after importing new photos. Repeating the command does not reprocess the already transparent catalog images.
