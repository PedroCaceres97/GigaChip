// products.js
// Instrucciones: incluir este script en cada página. Ver ejemplo abajo.
// Debe existir un <main id="products" data-category="smartphones"></main>

(async () => {
  // --- CONFIG ---
  const SHEET_ID = "1OxsUC-mX8tyjkDHhvl0ZR9G4Gj7zluKfuDDCkgGtqmM"; // <<-- reemplazar
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  // timeout / retry simple opcional
  const fetchText = async (url) => {
    const res = await fetch(url, {cache: "no-cache"});
    return await res.text();
  };

  function parseGviz(text) {
    // Extrae el JSON dentro de google.visualization.Query.setResponse(...)
    const marker = "setResponse(";
    const i = text.indexOf(marker);
    if (i === -1) throw new Error("No es un JSON gviz válido");
    const jsonText = text.substring(i + marker.length, text.lastIndexOf(")"));
    return JSON.parse(jsonText);
  }

  function rowsToObjects(gviz) {
    const cols = gviz.table.cols.map(c => c.label || c.id || `col${Math.random()}`);
    const rows = (gviz.table.rows || []).map(r => {
      const obj = {};
      r.c.forEach((cell, i) => {
        obj[cols[i]] = cell ? cell.v : "";
      });
      return obj;
    });
    return rows;
  }

  function imageUrl(fileId) {
    if (!fileId) return "";
    // URL embebible de Drive (requiere que el archivo sea "Anyone with link -> view")
    return `https://i.ibb.co/${fileId}`;
  }

  function formatPrice(num) {
    if (num === null || num === undefined || num === "") return "";
    // Mostrar como $20.000 (sin decimals)
    const n = Number(num);
    if (Number.isNaN(n)) return num;
    return "$" + new Intl.NumberFormat('es-AR').format(Math.round(n));
  }

  function productCardHTML(prod) {
    const imgSrc = imageUrl(prod.image);
    const title = prod.title || "";
    const price = formatPrice(prod.price);
    const stockNum = Number(prod.stock);
    const stockText = (isNaN(stockNum) ? prod.stock : (stockNum <= 0 ? "Sin Stock" : `Stock: ${stockNum}`));

    // Ajustá la estructura a tu HTML/CSS exacto
    return `
      <div class="product" data-id="${prod.id || ""}">
        <img src="${imgSrc}" alt="${escapeHtml(title)}" onerror="this.style.opacity=0.6;this.alt='Imagen no disponible'">
        <p class="title">${escapeHtml(title)}</p>
        <p class="price">${escapeHtml(price)}</p>
        <p class="stock">${escapeHtml(stockText)}</p>
      </div>
    `;
  }

  // simple escape para evitar inyección de HTML desde la sheet
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // MAIN
  try {
    const main = document.querySelector("main");
    if (!main) return;
    const pageCategory = main.dataset.category && main.dataset.category.trim().toLowerCase();

    const text = await fetchText(SHEET_URL);
    const gviz = parseGviz(text);
    const items = rowsToObjects(gviz).map(it => {
      // Normalizar keys a minúsculas (por si los headers varían)
      const normalized = {};
      Object.keys(it).forEach(k => normalized[k.trim().toLowerCase()] = it[k]);

      return {
        id: normalized['id'] ?? "",
        title: normalized['title'] ?? "",
        price: normalized['price'] ?? "",
        stock: normalized['stock'] ?? "",
        image: normalized['image'] ?? "",
        categorie: (normalized['categorie'] ?? normalized['category'] ?? "").toString().trim().toLowerCase(),
        description: normalized['description'] ?? ""
      };
    });

    // Filtrar por categoría si la página lo pide
    const filtered = pageCategory ? items.filter(p => p.categorie === pageCategory) : items;
    // Vaciar el main e insertar
    main.innerHTML = "";
    if (filtered.length === 0) {
      main.innerHTML = `<p class="empty">No hay productos en esta categoría.</p>`;
    } else {
      const html = filtered.map(productCardHTML).join("\n");
      main.innerHTML = html;
    }

  } catch (err) {
    console.error("Error cargando productos:", err);
    const main = document.querySelector("main#products");
    if (main) main.innerHTML = `<p class="error">No se pudieron cargar los productos. Revisa consola.</p>`;
  }

})();