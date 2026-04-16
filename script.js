// 📍 iniciar já dentro da área da Vale
var map = L.map('map').setView([-2.54, -44.32], 14);

// mapa base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let rotaLayer;
let veiculosLayer = [];

// 📍 limites da área
const limiteVale = L.latLngBounds(
    [-2.60, -44.40],
    [-2.48, -44.25]
);

map.setMaxBounds(limiteVale);
map.setMinZoom(13);
map.setMaxZoom(18);

map.on('drag', function () {
    map.panInsideBounds(limiteVale, { animate: false });
});

// 🚗 ÍCONE SVG (corrigido)
const iconeCaminhao = L.icon({
    iconUrl: 'uber.svg',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
});

// 🧠 valida rota
function rotaDentroDaArea(geojson, bounds) {
    return geojson.coordinates.every(coord =>
        bounds.contains(L.latLng(coord[1], coord[0]))
    );
}

// 🚗 gerar veículos NA ROTA (melhorado)
function gerarVeiculos(qtd, geometry) {

    // remove antigos
    veiculosLayer.forEach(v => map.removeLayer(v));
    veiculosLayer = [];

    const coords = geometry.coordinates;

    for (let i = 0; i < qtd; i++) {

        const index = Math.floor(Math.random() * coords.length);
        const ponto = coords[index];

        const lat = ponto[1] + (Math.random() - 0.5) * 0.0003;
        const lon = ponto[0] + (Math.random() - 0.5) * 0.0003;

        const marcador = L.marker([lat, lon], {
            icon: iconeCaminhao
        }).addTo(map);

        marcador.bindPopup(`🚗 Veículo ${i + 1}`);

        veiculosLayer.push(marcador);
    }
}

// 📍 buscar coordenadas
async function buscarCoordenadas(local) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${local}`);
        const data = await res.json();

        if (!data.length) {
            alert("Local não encontrado");
            return null;
        }

        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];

    } catch {
        alert("Erro ao buscar localização");
        return null;
    }
}

// 🚀 função principal
async function buscarRota() {

    const origem = document.getElementById("origem").value;
    const destino = document.getElementById("destino").value;

    if (!origem || !destino) {
        alert("Preencha origem e destino");
        return;
    }

    const coordOrigem = await buscarCoordenadas(origem);
    const coordDestino = await buscarCoordenadas(destino);

    if (!coordOrigem || !coordDestino) return;

    try {
        const rota = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordOrigem[1]},${coordOrigem[0]};${coordDestino[1]},${coordDestino[0]}?overview=full&geometries=geojson`
        );

        const data = await rota.json();

        if (!data.routes?.length) {
            alert("Rota não encontrada");
            return;
        }

        const geometry = data.routes[0].geometry;

        if (rotaLayer) map.removeLayer(rotaLayer);

        // ❌ rota inválida
        if (!rotaDentroDaArea(geometry, limiteVale)) {

            rotaLayer = L.geoJSON(geometry, {
                style: { color: 'red', weight: 5 }
            }).addTo(map);

            document.getElementById("info").innerText =
                "❌ Rota fora da área permitida";

            document.getElementById("veiculos").innerText =
                "Veículos disponíveis: 0 | 🚫";

            gerarVeiculos(0);

            return;
        }

        // ✅ rota válida
        rotaLayer = L.geoJSON(geometry, {
            style: { color: 'blue', weight: 5 }
        }).addTo(map);

        map.fitBounds(rotaLayer.getBounds());

        const distancia = (data.routes[0].distance / 1000).toFixed(2);
        const tempo = (data.routes[0].duration / 60).toFixed(0);

        document.getElementById("info").innerText =
            `Distância: ${distancia} km | Tempo: ${tempo} min`;

        // 🎲 veículos
        const veiculos = Math.floor(Math.random() * 15) + 1;

        let status =
            veiculos <= 3 ? "⚠️ Baixa" :
            veiculos <= 8 ? "🟡 Média" :
            "🟢 Alta";

        document.getElementById("veiculos").innerText =
            `Veículos disponíveis: ${veiculos} | ${status}`;

        // 🚗 AGORA NA ROTA
        gerarVeiculos(veiculos, geometry);

    } catch {
        alert("Erro ao calcular rota");
    }
}