const INVOICES = [
    { numero: "FA-1042", cliente: "Acme S.A.", fecha: "2026-10-02", vence: "2026-10-17", importe: 4850, estado: "pagada" },
    { numero: "FA-1043", cliente: "Estudio Nova", fecha: "2026-10-03", vence: "2026-10-18", importe: 2300, estado: "pendiente" },
    { numero: "FA-1044", cliente: "Distribuidora Sur", fecha: "2026-10-05", vence: "2026-10-20", importe: 7120, estado: "pagada" },
    { numero: "FA-1045", cliente: "González, María", fecha: "2026-10-07", vence: "2026-10-22", importe: 980, estado: "pendiente" },
    { numero: "FA-1046", cliente: "Taller Río", fecha: "2026-10-09", vence: "2026-10-24", importe: 1540, estado: "vencida" },
    { numero: "FA-1047", cliente: "Logística Andina", fecha: "2026-10-10", vence: "2026-10-25", importe: 6400, estado: "pagada" },
    { numero: "FA-1048", cliente: "Café Central", fecha: "2026-10-12", vence: "2026-10-27", importe: 720, estado: "pendiente" },
    { numero: "FA-1049", cliente: "Vega Consultora", fecha: "2026-10-14", vence: "2026-10-29", importe: 3250, estado: "pagada" },
    { numero: "FA-1050", cliente: "Metalúrgica Paz", fecha: "2026-10-16", vence: "2026-10-31", importe: 8900, estado: "vencida" },
    { numero: "FA-1051", cliente: "Clínica Norte", fecha: "2026-10-18", vence: "2026-11-02", importe: 4100, estado: "pendiente" },
    { numero: "FA-1052", cliente: "Editora Luz", fecha: "2026-10-20", vence: "2026-11-04", importe: 1180, estado: "pagada" },
    { numero: "FA-1053", cliente: "Campos & Co", fecha: "2026-10-21", vence: "2026-11-05", importe: 5470, estado: "pendiente" }
];

const CHART = [
    { mes: "May", valor: 28400 },
    { mes: "Jun", valor: 31200 },
    { mes: "Jul", valor: 29800 },
    { mes: "Ago", valor: 35600 },
    { mes: "Sep", valor: 41300 },
    { mes: "Oct", valor: 46810 }
];

const ESTADOS = {
    pagada: "Pagada",
    pendiente: "Pendiente",
    vencida: "Vencida"
};

const money = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
});

const dateFmt = new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
});

const state = {
    query: "",
    status: "all",
    sort: "fecha-desc",
    loading: false,
    error: false,
    rows: []
};

const els = {
    tableBody: document.getElementById("table-body"),
    tableFoot: document.getElementById("table-foot"),
    tableTotal: document.getElementById("table-total"),
    tableCount: document.getElementById("table-count"),
    loading: document.getElementById("state-loading"),
    empty: document.getElementById("state-empty"),
    error: document.getElementById("state-error"),
    search: document.getElementById("search"),
    statusFilter: document.getElementById("status-filter"),
    sort: document.getElementById("sort"),
    dist: document.getElementById("dist"),
    chart: document.getElementById("chart"),
    chartTable: document.getElementById("chart-table"),
    toast: document.getElementById("toast"),
    sidebar: document.getElementById("sidebar"),
    overlay: document.getElementById("sidebar-overlay"),
    burger: document.getElementById("nav-burger")
};

function parseDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function fmtDate(iso) {
    return dateFmt.format(parseDate(iso));
}

function normalize(text) {
    return text
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function initials(name) {
    return name
        .replace(/[^\p{L}\s]/gu, "")
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toLocaleUpperCase("es"))
        .join("");
}

function setState(...names) {
    ["loading", "empty", "error"].forEach((name) => {
        els[name].hidden = !names.includes(name);
    });
    const tableHidden = names.length > 0;
    document.getElementById("table").hidden = tableHidden;
    els.tableFoot.hidden = tableHidden;
}

function getVisibleRows() {
    const query = normalize(state.query.trim());

    const rows = INVOICES.filter((row) => {
        const matchStatus = state.status === "all" || row.estado === state.status;
        const matchQuery =
            !query ||
            normalize(row.numero).includes(query) ||
            normalize(row.cliente).includes(query);
        return matchStatus && matchQuery;
    });

    const [key, dir] = state.sort.split("-");
    const factor = dir === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
        if (key === "importe") return (a.importe - b.importe) * factor;
        return (parseDate(a.fecha) - parseDate(b.fecha)) * factor;
    });
}

function renderTable() {
    if (state.error) {
        setState("error");
        els.tableCount.textContent = "No se pudieron cargar las facturas.";
        return;
    }

    if (state.loading) {
        setState("loading");
        els.tableCount.textContent = "Cargando facturas…";
        return;
    }

    const rows = state.rows;
    setState();

    if (rows.length === 0) {
        setState("empty");
        els.tableCount.textContent = "0 facturas encontradas";
        return;
    }

    const total = rows.reduce((sum, row) => sum + row.importe, 0);
    els.tableCount.textContent =
        `${rows.length} factura${rows.length === 1 ? "" : "s"} · total ${money.format(total)}`;
    els.tableTotal.textContent = money.format(total);

    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
        const tr = document.createElement("tr");

        const tdNumero = document.createElement("td");
        tdNumero.className = "invoice-id";
        tdNumero.textContent = row.numero;
        tr.append(tdNumero);

        const tdCliente = document.createElement("td");
        const clientWrap = document.createElement("div");
        clientWrap.className = "client-cell";
        const badge = document.createElement("span");
        badge.className = "client-badge";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = initials(row.cliente);
        const clientName = document.createElement("span");
        clientName.textContent = row.cliente;
        clientWrap.append(badge, clientName);
        tdCliente.append(clientWrap);
        tr.append(tdCliente);

        const tdFecha = document.createElement("td");
        tdFecha.textContent = fmtDate(row.fecha);
        tr.append(tdFecha);

        const tdVence = document.createElement("td");
        tdVence.textContent = fmtDate(row.vence);
        tr.append(tdVence);

        const tdImporte = document.createElement("td");
        tdImporte.className = "num";
        tdImporte.textContent = money.format(row.importe);
        tr.append(tdImporte);

        const tdEstado = document.createElement("td");
        const estadoBadge = document.createElement("span");
        estadoBadge.className = `badge badge-${row.estado}`;
        estadoBadge.textContent = ESTADOS[row.estado];
        tdEstado.append(estadoBadge);
        tr.append(tdEstado);

        const tdAcciones = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "row-actions";

        const viewBtn = document.createElement("button");
        viewBtn.type = "button";
        viewBtn.className = "row-btn";
        viewBtn.title = `Ver factura ${row.numero}`;
        const eyeIcon = document.createElement("i");
        eyeIcon.className = "fa-regular fa-eye";
        eyeIcon.setAttribute("aria-hidden", "true");
        const viewLabel = document.createElement("span");
        viewLabel.className = "sr-only";
        viewLabel.textContent = `Ver factura ${row.numero}`;
        viewBtn.append(eyeIcon, viewLabel);
        viewBtn.addEventListener("click", () => showToast(`Abriendo la factura ${row.numero}…`));

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "row-btn";
        downloadBtn.title = `Descargar ${row.numero}.pdf`;
        const downloadIcon = document.createElement("i");
        downloadIcon.className = "fa-solid fa-download";
        downloadIcon.setAttribute("aria-hidden", "true");
        const downloadLabel = document.createElement("span");
        downloadLabel.className = "sr-only";
        downloadLabel.textContent = `Descargar factura ${row.numero}`;
        downloadBtn.append(downloadIcon, downloadLabel);
        downloadBtn.addEventListener("click", () => showToast(`Descargando ${row.numero}.pdf…`));

        actions.append(viewBtn, downloadBtn);
        tdAcciones.append(actions);
        tr.append(tdAcciones);

        fragment.append(tr);
    });

    els.tableBody.replaceChildren(fragment);
    els.tableFoot.hidden = false;
}

function renderKPIs() {
    const total = INVOICES.reduce((sum, row) => sum + row.importe, 0);
    const pending = INVOICES.filter((row) => row.estado === "pendiente");
    const overdue = INVOICES.filter((row) => row.estado === "vencida");

    document.getElementById("kpi-total").textContent = money.format(total);
    document.getElementById("kpi-count").textContent = INVOICES.length;
    document.getElementById("kpi-pending").textContent = money.format(
        pending.reduce((sum, row) => sum + row.importe, 0)
    );
    document.getElementById("kpi-pending-count").textContent = pending.length;
    document.getElementById("kpi-overdue").textContent = overdue.length;
    document.getElementById("kpi-overdue-amount").textContent = money.format(
        overdue.reduce((sum, row) => sum + row.importe, 0)
    );
}

function renderDist() {
    const total = INVOICES.reduce((sum, row) => sum + row.importe, 0);

    els.dist.replaceChildren();

    Object.keys(ESTADOS).forEach((key) => {
        const amount = INVOICES.filter((row) => row.estado === key).reduce(
            (sum, row) => sum + row.importe,
            0
        );
        const pct = Math.round((amount / total) * 100);

        const li = document.createElement("li");

        const head = document.createElement("div");
        head.className = "dist-head";

        const name = document.createElement("span");
        name.className = "dist-name";
        const dot = document.createElement("span");
        dot.className = `dot dot-${key}`;
        dot.setAttribute("aria-hidden", "true");
        name.append(dot, document.createTextNode(ESTADOS[key]));

        const amountEl = document.createElement("span");
        amountEl.className = "dist-amount";
        amountEl.textContent = `${money.format(amount)} · ${pct}%`;

        head.append(name, amountEl);

        const track = document.createElement("div");
        track.className = "dist-track";
        const fill = document.createElement("span");
        fill.className = `fill-${key}`;
        fill.style.width = "0%";
        track.append(fill);

        li.append(head, track);
        els.dist.append(li);

        requestAnimationFrame(() => {
            fill.style.width = `${pct}%`;
        });
    });
}

function renderChart() {
    const max = Math.max(...CHART.map((item) => item.valor));
    const fragment = document.createDocumentFragment();

    CHART.forEach((item, index) => {
        const bar = document.createElement("div");
        bar.className = "bar";
        if (index === CHART.length - 1) bar.classList.add("is-highlight");

        const value = document.createElement("span");
        value.className = "bar-value";
        value.textContent = item.valor.toLocaleString("es");

        const fill = document.createElement("span");
        fill.className = "bar-fill";
        fill.style.setProperty("--h", "0%");

        const label = document.createElement("span");
        label.className = "bar-label";
        label.textContent = item.mes;

        bar.append(value, fill, label);
        fragment.append(bar);

        requestAnimationFrame(() => {
            fill.style.setProperty("--h", `${Math.round((item.valor / max) * 100)}%`);
        });
    });

    els.chart.replaceChildren(fragment);

    const tableFragment = document.createDocumentFragment();
    CHART.forEach((item) => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.scope = "row";
        th.textContent = item.mes;
        const td = document.createElement("td");
        td.textContent = money.format(item.valor);
        tr.append(th, td);
        tableFragment.append(tr);
    });
    els.chartTable.replaceChildren(tableFragment);
}

function load() {
    state.loading = true;
    state.error = false;
    renderTable();

    window.setTimeout(() => {
        try {
            if (!Array.isArray(INVOICES)) throw new Error("datos inválidos");
            state.loading = false;
            state.error = false;
            state.rows = getVisibleRows();
            renderTable();
        } catch (error) {
            state.loading = false;
            state.error = true;
            renderTable();
        }
    }, 700);
}

function applyFilters() {
    state.rows = getVisibleRows();
    renderTable();
}

let searchTimer;
els.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        state.query = els.search.value;
        applyFilters();
    }, 220);
});

els.statusFilter.addEventListener("change", () => {
    state.status = els.statusFilter.value;
    applyFilters();
});

els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    applyFilters();
});

document.getElementById("btn-clear").addEventListener("click", () => {
    state.query = "";
    state.status = "all";
    state.sort = "fecha-desc";
    els.search.value = "";
    els.statusFilter.value = "all";
    els.sort.value = "fecha-desc";
    applyFilters();
    els.search.focus();
});

document.getElementById("btn-retry").addEventListener("click", load);
document.getElementById("btn-refresh-top").addEventListener("click", load);

document.getElementById("btn-new").addEventListener("click", () => {
    showToast("El formulario de nueva factura llega en la próxima versión.");
});

document.getElementById("btn-csv").addEventListener("click", () => {
    const rows = state.rows;
    if (rows.length === 0) {
        showToast("No hay facturas para exportar con los filtros actuales.");
        return;
    }

    const header = ["Numero", "Cliente", "Emision", "Vencimiento", "Importe", "Estado"];
    const body = rows.map((row) => [
        row.numero,
        row.cliente,
        fmtDate(row.fecha),
        fmtDate(row.vence),
        row.importe,
        ESTADOS[row.estado]
    ]);

    const csv = [header, ...body]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "facturas-octubre-2026.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast(`${rows.length} factura${rows.length === 1 ? "" : "s"} exportada${rows.length === 1 ? "" : "s"} a CSV.`);
});

let toastTimer;
function showToast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        els.toast.hidden = true;
    }, 3200);
}

/* ---------- Menú lateral ---------- */

function openSidebar() {
    els.sidebar.classList.add("is-open");
    els.overlay.hidden = false;
    els.burger.setAttribute("aria-expanded", "true");
    els.burger.querySelector(".sr-only").textContent = "Cerrar menú lateral";
    const firstLink = els.sidebar.querySelector("a");
    if (firstLink) firstLink.focus();
}

function closeSidebar(returnFocus) {
    els.sidebar.classList.remove("is-open");
    els.overlay.hidden = true;
    els.burger.setAttribute("aria-expanded", "false");
    els.burger.querySelector(".sr-only").textContent = "Abrir menú lateral";
    if (returnFocus) els.burger.focus();
}

els.burger.addEventListener("click", () => {
    if (els.sidebar.classList.contains("is-open")) closeSidebar(true);
    else openSidebar();
});

els.overlay.addEventListener("click", () => closeSidebar(true));

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.sidebar.classList.contains("is-open")) {
        closeSidebar(true);
    }
});

window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024 && els.sidebar.classList.contains("is-open")) {
        closeSidebar(false);
    }
});

const navLinks = document.querySelectorAll(".sidebar a");
navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.forEach((other) => {
            other.classList.remove("is-active");
            other.removeAttribute("aria-current");
        });
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
        if (window.innerWidth < 1024) closeSidebar(false);
    });
});

document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("auth");
    location.replace("login.html");
});

renderKPIs();
renderDist();
renderChart();
load();
