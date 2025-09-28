// 1. Importaciones de módulos necesarios
const express = require('express');
const path = require('path');

// 2. Configuración inicial de la aplicación Express
const app = express();
const PORT = 3000;

// 3. Middlewares
// Parsea el cuerpo de las peticiones POST con formato JSON
app.use(express.json());
// Sirve todos los archivos estáticos (HTML, CSS, JS) desde la carpeta 'public'
app.use(express.static('public'));

// -----------------------------------------------------------------------------
// --- LÓGICA DE NEGOCIO: Simulación de promociones, cashback y puntos ---
// -----------------------------------------------------------------------------
function simulateAndCalculate(lines, cashbackToRedeem = 0) {
    let subtotal = 0;
    const snippetLines = [];
    const promotionsApplied = [];

    // --- PASO 1: Calcular subtotal y aplicar promociones por artículo ---
    lines.forEach(line => {
        const lineTotal = line.price * line.quantity;
        subtotal += lineTotal;

        // Promoción: 50% de descuento en la segunda unidad (si la cantidad es >= 2)
        if (line.quantity >= 2) {
            const discountedUnits = Math.floor(line.quantity / 2);
            const discount = discountedUnits * (line.price * 0.5);
            subtotal -= discount; // Restamos el descuento del subtotal
            snippetLines.push(`Dto. 50% 2ª Ud. (Prod ${line.product_id}): -${discount.toFixed(2)}€`);
            promotionsApplied.push({
                promotion_id: 201,
                discount: discount,
                product_id: line.product_id,
                description: `50% discount on ${discountedUnits} unit(s)`
            });
        }
    });

    // --- PASO 2: Aplicar cashback sobre el total acumulado ---
    let totalAfterPromos = subtotal;
    if (cashbackToRedeem > 0 && totalAfterPromos > 0) {
        // Aseguramos no redimir más cashback que el total a pagar
        const actualCashback = Math.min(totalAfterPromos, cashbackToRedeem);
        totalAfterPromos -= actualCashback;
        snippetLines.push(`Cashback Redimido: -${actualCashback.toFixed(2)}€`);
    }

    const finalTotal = totalAfterPromos;

    // --- PASO 3: Calcular puntos ganados sobre el total final pagado ---
    // Regla: 10 puntos por cada euro gastado
    const pointsEarned = Math.floor(finalTotal * 10);
    if (pointsEarned > 0) {
        snippetLines.push(`Puntos Acumulados: +${pointsEarned} pts`);
    }

    // --- Devolver todos los resultados calculados ---
    return {
        finalTotal: finalTotal < 0 ? 0 : finalTotal, // El total final no puede ser negativo
        snippetLines,
        promotionsApplied,
        pointsEarned
    };
}

// -----------------------------------------------------------------------------
// --- ENDPOINT DEL API: /cart/simulate ---
// -----------------------------------------------------------------------------
app.post('/cart/simulate', (req, res) => {
    // Extraer datos del cuerpo de la petición
    const { ticket_id, creation_date, lines, cashback_to_redeem } = req.body;

    // Validación de entrada básica
    if (!ticket_id || !lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Faltan datos requeridos o son incorrectos: se necesita ticket_id y un array de lines.' });
    }

    // Ejecutar la simulación de negocio
    const simulation = simulateAndCalculate(lines, cashback_to_redeem);

    // Construir la respuesta completa del API con la estructura definida
    const fullResponse = {
        id: ticket_id,
        code: `CODE-${ticket_id}`,
        total: simulation.finalTotal,
        currency: "EUR",
        lines: lines.map((line, index) => ({
            order: index + 1,
            product_id: line.product_id,
            tot_line: line.price * line.quantity,
            quantity: line.quantity,
            product_name: `Producto ${line.product_id}`,
        })),
        promotions: simulation.promotionsApplied,
        points_earned: simulation.pointsEarned,
        TicketSnippet: simulation.snippetLines,
        // (Resto de campos con datos de ejemplo para completar la estructura)
        location_id: 12,
        customer_id: 8223,
        creation_date: creation_date || new Date().toISOString(),
        business_name: "SuperMarket S.L. Spain",
        tpv_id: "A55",
    };

    // Enviar la respuesta como JSON
    res.status(200).json(fullResponse);
});

// -----------------------------------------------------------------------------
// --- INICIO DEL SERVIDOR ---
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado y escuchando en http://localhost:${PORT}`);
    console.log('   La aplicación está disponible en la ruta principal.');
    console.log('   El endpoint de simulación está en: POST /cart/simulate');
});