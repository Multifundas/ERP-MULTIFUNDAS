// ========================================
// ERP MULTIFUNDAS - BASE DE DATOS LOCAL
// ========================================

// Almacenamiento en LocalStorage
const DB_KEY = 'erp_multifundas_db';

// Estructura inicial de datos
const initialData = {
    // Configuración del sistema
    config: {
        companyName: 'Multifundas',
        alertInterval: 60, // minutos
        excessThreshold: 5, // % exceso permitido
        inactivityAlert: 30 // minutos
    },

    // Áreas de producción (para procesos)
    areas: [
        { id: 1, nombre: 'Corte Volumen', activa: true, color: '#3b82f6' },
        { id: 2, nombre: 'Corte a Medida', activa: true, color: '#10b981' },
        { id: 3, nombre: 'Serigrafía', activa: true, color: '#f59e0b' },
        { id: 4, nombre: 'Corte Cierre', activa: true, color: '#8b5cf6' },
        { id: 5, nombre: 'Corte Bies', activa: true, color: '#ec4899' },
        { id: 6, nombre: 'Costura Fundas', activa: true, color: '#06b6d4' },
        { id: 7, nombre: 'Costura Volumen', activa: true, color: '#14b8a6' },
        { id: 8, nombre: 'Calidad y Empaque', activa: true, color: '#f97316' }
    ],

    // Áreas del Mapa de Planta (layout físico)
    areasPlanta: [
        { id: 'manual', nombre: 'Manual', posiciones: 1, color: '#94a3b8' },
        { id: 'extras', nombre: 'Extras', posiciones: 2, color: '#f59e0b' },
        { id: 'costura', nombre: 'Costura', posiciones: 24, color: '#3b82f6' },
        { id: 'empaque', nombre: 'Empaque y Calidad', posiciones: 6, color: '#ec4899' },
        { id: 'serigrafia', nombre: 'Serigrafía', posiciones: 2, color: '#f59e0b' },
        { id: 'cortebies', nombre: 'Corte de Bies', posiciones: 2, color: '#10b981' },
        { id: 'doblado', nombre: 'Doblado de Fundas', posiciones: 2, color: '#8b5cf6' },
        { id: 'corte', nombre: 'Área de Corte', posiciones: 2, color: '#06b6d4' },
        { id: 'cortemedida', nombre: 'Corte a Medida', posiciones: 3, color: '#14b8a6' }
    ],

    // Estaciones de trabajo (posiciones físicas en planta)
    estaciones: [
        // Manual
        { id: 'M1', areaPlantaId: 'manual', nombre: 'Manual 1', operadorId: null },
        // Extras
        { id: 'EX1', areaPlantaId: 'extras', nombre: 'Extra 1', operadorId: 13 },
        { id: 'EX2', areaPlantaId: 'extras', nombre: 'Extra 2', operadorId: null },
        // Costura (24 posiciones)
        { id: 'C1', areaPlantaId: 'costura', nombre: 'Costura 1', operadorId: 1 },
        { id: 'C2', areaPlantaId: 'costura', nombre: 'Costura 2', operadorId: 2 },
        { id: 'C3', areaPlantaId: 'costura', nombre: 'Costura 3', operadorId: 14 },
        { id: 'C4', areaPlantaId: 'costura', nombre: 'Costura 4', operadorId: 15 },
        { id: 'C5', areaPlantaId: 'costura', nombre: 'Costura 5', operadorId: 16 },
        { id: 'C6', areaPlantaId: 'costura', nombre: 'Costura 6', operadorId: 17 },
        { id: 'C7', areaPlantaId: 'costura', nombre: 'Costura 7', operadorId: null },
        { id: 'C8', areaPlantaId: 'costura', nombre: 'Costura 8', operadorId: null },
        { id: 'C9', areaPlantaId: 'costura', nombre: 'Costura 9', operadorId: 18 },
        { id: 'C10', areaPlantaId: 'costura', nombre: 'Costura 10', operadorId: 19 },
        { id: 'C11', areaPlantaId: 'costura', nombre: 'Costura 11', operadorId: null },
        { id: 'C12', areaPlantaId: 'costura', nombre: 'Costura 12', operadorId: null },
        { id: 'C13', areaPlantaId: 'costura', nombre: 'Costura 13', operadorId: 20 },
        { id: 'C14', areaPlantaId: 'costura', nombre: 'Costura 14', operadorId: null },
        { id: 'C15', areaPlantaId: 'costura', nombre: 'Costura 15', operadorId: null },
        { id: 'C16', areaPlantaId: 'costura', nombre: 'Costura 16', operadorId: null },
        { id: 'C17', areaPlantaId: 'costura', nombre: 'Costura 17', operadorId: null },
        { id: 'C18', areaPlantaId: 'costura', nombre: 'Costura 18', operadorId: null },
        { id: 'C19', areaPlantaId: 'costura', nombre: 'Costura 19', operadorId: null },
        { id: 'C20', areaPlantaId: 'costura', nombre: 'Costura 20', operadorId: null },
        { id: 'C21', areaPlantaId: 'costura', nombre: 'Costura 21', operadorId: null },
        { id: 'C22', areaPlantaId: 'costura', nombre: 'Costura 22', operadorId: null },
        { id: 'C23', areaPlantaId: 'costura', nombre: 'Costura 23', operadorId: null },
        { id: 'C24', areaPlantaId: 'costura', nombre: 'Costura 24', operadorId: null },
        // Empaque y Calidad
        { id: 'EC1', areaPlantaId: 'empaque', nombre: 'Empaque 1', operadorId: 6 },
        { id: 'EC2', areaPlantaId: 'empaque', nombre: 'Empaque 2', operadorId: 21 },
        { id: 'EC3', areaPlantaId: 'empaque', nombre: 'Calidad 1', operadorId: 22 },
        { id: 'EC4', areaPlantaId: 'empaque', nombre: 'Calidad 2', operadorId: null },
        { id: 'EC5', areaPlantaId: 'empaque', nombre: 'Empaque 3', operadorId: null },
        { id: 'EC6', areaPlantaId: 'empaque', nombre: 'Empaque 4', operadorId: null },
        // Serigrafía
        { id: 'S1', areaPlantaId: 'serigrafia', nombre: 'Serigrafía 1', operadorId: 5 },
        { id: 'S2', areaPlantaId: 'serigrafia', nombre: 'Serigrafía 2', operadorId: null },
        // Corte de Bies
        { id: 'CB1', areaPlantaId: 'cortebies', nombre: 'Corte Bies 1', operadorId: 9 },
        { id: 'CB2', areaPlantaId: 'cortebies', nombre: 'Corte Bies 2', operadorId: null },
        // Doblado de Fundas
        { id: 'D1', areaPlantaId: 'doblado', nombre: 'Doblado 1', operadorId: 23 },
        { id: 'D2', areaPlantaId: 'doblado', nombre: 'Doblado 2', operadorId: null },
        // Área de Corte
        { id: 'CO1', areaPlantaId: 'corte', nombre: 'Corte 1', operadorId: 24 },
        { id: 'CO2', areaPlantaId: 'corte', nombre: 'Corte 2', operadorId: null },
        // Corte a Medida
        { id: 'CM1', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 1', operadorId: null },
        { id: 'CM2', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 2', operadorId: null },
        { id: 'CM3', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 3', operadorId: null }
    ],

    // Estado de operadores en tiempo real (para el mapa)
    estadoOperadores: [
        { operadorId: 1, estacionId: 'C1', estado: 'adelantado', efectividad: 115, iniciales: 'CR' },
        { operadorId: 2, estacionId: 'C2', estado: 'adelantado', efectividad: 112, iniciales: 'MG' },
        { operadorId: 14, estacionId: 'C3', estado: 'retrasado', efectividad: 85, iniciales: 'JH' },
        { operadorId: 15, estacionId: 'C4', estado: 'muy-retrasado', efectividad: 78, iniciales: 'LT' },
        { operadorId: 16, estacionId: 'C5', estado: 'adelantado', efectividad: 118, iniciales: 'ER' },
        { operadorId: 17, estacionId: 'C6', estado: 'adelantado', efectividad: 110, iniciales: 'MO' },
        { operadorId: 18, estacionId: 'C9', estado: 'retrasado', efectividad: 88, iniciales: 'SJ' },
        { operadorId: 19, estacionId: 'C10', estado: 'muy-retrasado', efectividad: 75, iniciales: 'JM' },
        { operadorId: 20, estacionId: 'C13', estado: 'adelantado', efectividad: 122, iniciales: 'AR' },
        { operadorId: 6, estacionId: 'EC1', estado: 'adelantado', efectividad: 108, iniciales: 'RF' },
        { operadorId: 21, estacionId: 'EC2', estado: 'inactivo', efectividad: 0, iniciales: 'CV' },
        { operadorId: 22, estacionId: 'EC3', estado: 'retrasado', efectividad: 92, iniciales: 'SC' },
        { operadorId: 5, estacionId: 'S1', estado: 'adelantado', efectividad: 125, iniciales: 'PS' },
        { operadorId: 9, estacionId: 'CB1', estado: 'adelantado', efectividad: 115, iniciales: 'RD' },
        { operadorId: 23, estacionId: 'D1', estado: 'adelantado', efectividad: 111, iniciales: 'PM' },
        { operadorId: 24, estacionId: 'CO1', estado: 'inactivo', efectividad: 0, iniciales: 'AL' },
        { operadorId: 13, estacionId: 'EX1', estado: 'adelantado', efectividad: 105, iniciales: 'FC' }
    ],

    // Procesos por área
    procesos: [
        // Corte a Medida
        { id: 1, areaId: 2, nombre: 'Corte de espalda', tiempoEstandar: 2.5, unidad: 'min/pza' },
        { id: 2, areaId: 2, nombre: 'Corte de lado ventana', tiempoEstandar: 2.0, unidad: 'min/pza' },
        { id: 3, areaId: 2, nombre: 'Corte de lado completo', tiempoEstandar: 2.2, unidad: 'min/pza' },
        { id: 4, areaId: 2, nombre: 'Corte ventana C4', tiempoEstandar: 1.8, unidad: 'min/pza' },
        // Serigrafía
        { id: 5, areaId: 3, nombre: 'Impresión de logotipo', tiempoEstandar: 1.5, unidad: 'min/pza' },
        // Corte Cierre
        { id: 6, areaId: 4, nombre: 'Corte de cierre negro 1.48m', tiempoEstandar: 0.8, unidad: 'min/pza' },
        // Corte Bies
        { id: 7, areaId: 5, nombre: 'Corte de bies (800cm)', tiempoEstandar: 1.2, unidad: 'min/pza' },
        // Costura Volumen
        { id: 8, areaId: 7, nombre: 'Costura de ventana', tiempoEstandar: 3.0, unidad: 'min/pza' },
        { id: 9, areaId: 7, nombre: 'Costura de cierre', tiempoEstandar: 2.5, unidad: 'min/pza' },
        { id: 10, areaId: 7, nombre: 'Costura de frentes', tiempoEstandar: 2.8, unidad: 'min/pza' },
        { id: 11, areaId: 7, nombre: 'Cerrado de portavestido', tiempoEstandar: 3.5, unidad: 'min/pza' },
        // Calidad y Empaque
        { id: 12, areaId: 8, nombre: 'Revisión de piezas', tiempoEstandar: 1.0, unidad: 'min/pza' },
        { id: 13, areaId: 8, nombre: 'Empaque en cajas', tiempoEstandar: 0.5, unidad: 'min/pza' },
        { id: 14, areaId: 8, nombre: 'Impresión de etiqueta', tiempoEstandar: 0.3, unidad: 'min/pza' },
        // Corte Volumen
        { id: 15, areaId: 1, nombre: 'Corte de tela principal', tiempoEstandar: 1.5, unidad: 'min/pza' },
        { id: 16, areaId: 1, nombre: 'Corte de forro', tiempoEstandar: 1.2, unidad: 'min/pza' }
    ],

    // Clientes
    clientes: [
        {
            id: 1,
            razonSocial: 'Cruella SA de CV',
            nombreComercial: 'Cruella Fashion',
            tipo: 'estrategico',
            contacto: 'María García',
            email: 'maria@cruella.com',
            telefono: '55 1234 5678',
            direccion: 'Av. Reforma 123, CDMX',
            accesoPortal: true,
            usuario: 'cruella',
            fechaAlta: '2024-01-15',
            articulosFrecuentes: [
                { productoId: 1, notas: 'Producto principal', ultimoPrecio: 85.00 }
            ]
        },
        {
            id: 2,
            razonSocial: 'Fashion Corp Internacional',
            nombreComercial: 'Fashion Corp',
            tipo: 'estrategico',
            contacto: 'Carlos López',
            email: 'carlos@fashioncorp.com',
            telefono: '55 9876 5432',
            direccion: 'Insurgentes Sur 456, CDMX',
            accesoPortal: true,
            usuario: 'fashion',
            fechaAlta: '2024-02-20',
            articulosFrecuentes: [
                { productoId: 2, notas: 'Pide cada mes', ultimoPrecio: 125.00 }
            ]
        },
        {
            id: 3,
            razonSocial: 'Textiles Unidos SA',
            nombreComercial: 'Textiles Unidos',
            tipo: 'externo',
            contacto: 'Ana Martínez',
            email: 'ana@textilesunidos.com',
            telefono: '55 5555 1234',
            direccion: 'Zona Industrial, Edo. Méx.',
            accesoPortal: false,
            usuario: null,
            fechaAlta: '2024-03-10',
            articulosFrecuentes: [
                { productoId: 3, notas: 'Pedidos grandes', ultimoPrecio: 45.00 }
            ]
        }
    ],

    // Familias de productos
    familias: [
        { id: 1, nombre: 'Porta Vestidos', color: '#3b82f6' },
        { id: 2, nombre: 'Fundas', color: '#10b981' },
        { id: 3, nombre: 'Bolsas', color: '#f59e0b' },
        { id: 4, nombre: 'Accesorios', color: '#8b5cf6' }
    ],

    // Subfamilias de productos
    subfamilias: [
        { id: 1, familiaId: 1, nombre: 'Sencillos' },
        { id: 2, familiaId: 1, nombre: 'Con Bolsa' },
        { id: 3, familiaId: 1, nombre: 'Premium' },
        { id: 4, familiaId: 2, nombre: 'Traje' },
        { id: 5, familiaId: 2, nombre: 'Abrigo' },
        { id: 6, familiaId: 2, nombre: 'Vestido' },
        { id: 7, familiaId: 3, nombre: 'Industrial' },
        { id: 8, familiaId: 3, nombre: 'Comercial' },
        { id: 9, familiaId: 4, nombre: 'Ganchos' },
        { id: 10, familiaId: 4, nombre: 'Etiquetas' }
    ],

    // Productos (catálogo por cliente) - Con ruta de procesos mejorada
    productos: [
        {
            id: 1,
            clienteId: 1,
            familiaId: 1,
            subfamiliaId: 1,
            nombre: 'Porta Vestido Sencillo 1.60 x 0.62',
            medidas: '160cm x 62cm',
            materiales: 'Tela no tejida 80g, cierre negro 1.48m, bies 800cm',
            descripcion: 'Porta vestido sencillo con ventana transparente',
            // Ruta de procesos con capacidad y control
            rutaProcesos: [
                { orden: 1, nombre: 'Corte de espalda', areaPlantaId: 'cortemedida', capacidadHora: 24, tiempoEstandar: 2.5, habilitado: true },
                { orden: 2, nombre: 'Corte de lado ventana', areaPlantaId: 'cortemedida', capacidadHora: 30, tiempoEstandar: 2.0, habilitado: true },
                { orden: 3, nombre: 'Corte de lado completo', areaPlantaId: 'cortemedida', capacidadHora: 27, tiempoEstandar: 2.2, habilitado: true },
                { orden: 4, nombre: 'Corte ventana C4', areaPlantaId: 'corte', capacidadHora: 33, tiempoEstandar: 1.8, habilitado: true },
                { orden: 5, nombre: 'Impresión de logotipo', areaPlantaId: 'serigrafia', capacidadHora: 40, tiempoEstandar: 1.5, habilitado: true },
                { orden: 6, nombre: 'Corte de cierre', areaPlantaId: 'corte', capacidadHora: 75, tiempoEstandar: 0.8, habilitado: true },
                { orden: 7, nombre: 'Corte de bies', areaPlantaId: 'cortebies', capacidadHora: 50, tiempoEstandar: 1.2, habilitado: true },
                { orden: 8, nombre: 'Costura de ventana', areaPlantaId: 'costura', capacidadHora: 20, tiempoEstandar: 3.0, habilitado: true },
                { orden: 9, nombre: 'Costura de cierre', areaPlantaId: 'costura', capacidadHora: 24, tiempoEstandar: 2.5, habilitado: true },
                { orden: 10, nombre: 'Costura de frentes', areaPlantaId: 'costura', capacidadHora: 21, tiempoEstandar: 2.8, habilitado: true },
                { orden: 11, nombre: 'Cerrado de portavestido', areaPlantaId: 'costura', capacidadHora: 17, tiempoEstandar: 3.5, habilitado: true },
                { orden: 12, nombre: 'Revisión de calidad', areaPlantaId: 'empaque', capacidadHora: 60, tiempoEstandar: 1.0, habilitado: true },
                { orden: 13, nombre: 'Empaque', areaPlantaId: 'empaque', capacidadHora: 120, tiempoEstandar: 0.5, habilitado: true }
            ],
            tiempoTotal: 22.3,
            imagen: null,
            comentarios: 'Cliente frecuente. Priorizar en temporada alta.',
            version: 1,
            activo: true
        },
        {
            id: 2,
            clienteId: 2,
            familiaId: 2,
            subfamiliaId: 4,
            nombre: 'Funda Traje Premium',
            medidas: '180cm x 65cm',
            materiales: 'Tela no tejida 100g, cierre negro 1.70m, bies 900cm',
            descripcion: 'Funda premium para traje con doble ventana',
            rutaProcesos: [
                { orden: 1, nombre: 'Corte de espalda', areaPlantaId: 'cortemedida', capacidadHora: 22, tiempoEstandar: 2.7, habilitado: true },
                { orden: 2, nombre: 'Corte de lado ventana', areaPlantaId: 'cortemedida', capacidadHora: 28, tiempoEstandar: 2.1, habilitado: true },
                { orden: 3, nombre: 'Corte ventana doble', areaPlantaId: 'corte', capacidadHora: 25, tiempoEstandar: 2.4, habilitado: true },
                { orden: 4, nombre: 'Impresión de logotipo', areaPlantaId: 'serigrafia', capacidadHora: 35, tiempoEstandar: 1.7, habilitado: true },
                { orden: 5, nombre: 'Corte de cierre largo', areaPlantaId: 'corte', capacidadHora: 70, tiempoEstandar: 0.85, habilitado: true },
                { orden: 6, nombre: 'Corte de bies premium', areaPlantaId: 'cortebies', capacidadHora: 45, tiempoEstandar: 1.3, habilitado: true },
                { orden: 7, nombre: 'Costura de ventana doble', areaPlantaId: 'costura', capacidadHora: 18, tiempoEstandar: 3.3, habilitado: true },
                { orden: 8, nombre: 'Costura de cierre', areaPlantaId: 'costura', capacidadHora: 22, tiempoEstandar: 2.7, habilitado: true },
                { orden: 9, nombre: 'Costura de frentes reforzados', areaPlantaId: 'costura', capacidadHora: 19, tiempoEstandar: 3.1, habilitado: true },
                { orden: 10, nombre: 'Cerrado premium', areaPlantaId: 'costura', capacidadHora: 15, tiempoEstandar: 4.0, habilitado: true },
                { orden: 11, nombre: 'Revisión de calidad premium', areaPlantaId: 'empaque', capacidadHora: 50, tiempoEstandar: 1.2, habilitado: true },
                { orden: 12, nombre: 'Empaque premium', areaPlantaId: 'empaque', capacidadHora: 100, tiempoEstandar: 0.6, habilitado: true }
            ],
            tiempoTotal: 25.0,
            imagen: null,
            comentarios: 'Producto premium. Usar materiales de primera calidad.',
            version: 1,
            activo: true
        },
        {
            id: 3,
            clienteId: 3,
            familiaId: 3,
            subfamiliaId: 7,
            nombre: 'Bolsa Industrial Grande',
            medidas: '100cm x 80cm',
            materiales: 'Polipropileno 120g',
            descripcion: 'Bolsa industrial para uso pesado',
            rutaProcesos: [
                { orden: 1, nombre: 'Corte de tela principal', areaPlantaId: 'corte', capacidadHora: 40, tiempoEstandar: 1.5, habilitado: true },
                { orden: 2, nombre: 'Corte de forro', areaPlantaId: 'corte', capacidadHora: 50, tiempoEstandar: 1.2, habilitado: true },
                { orden: 3, nombre: 'Costura base', areaPlantaId: 'costura', capacidadHora: 20, tiempoEstandar: 3.0, habilitado: true },
                { orden: 4, nombre: 'Cerrado industrial', areaPlantaId: 'costura', capacidadHora: 17, tiempoEstandar: 3.5, habilitado: true },
                { orden: 5, nombre: 'Revisión', areaPlantaId: 'empaque', capacidadHora: 60, tiempoEstandar: 1.0, habilitado: true },
                { orden: 6, nombre: 'Empaque a granel', areaPlantaId: 'empaque', capacidadHora: 120, tiempoEstandar: 0.5, habilitado: true }
            ],
            tiempoTotal: 10.7,
            imagen: null,
            comentarios: 'Producto estándar industrial.',
            version: 1,
            activo: true
        }
    ],

    // Personal (con horarios en lugar de turnos)
    personal: [
        { id: 1, nombre: 'Cristina Ramírez', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C1'] },
        { id: 2, nombre: 'Miguel García', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C2'] },
        { id: 3, nombre: 'Ana López', rol: 'operador', areaId: 2, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 55, activo: true, posiciones: [] },
        { id: 4, nombre: 'Carlos Ruiz', rol: 'operador', areaId: 1, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 52, activo: true, posiciones: [] },
        { id: 5, nombre: 'Patricia Sánchez', rol: 'operador', areaId: 3, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 60, activo: true, posiciones: ['S1'] },
        { id: 6, nombre: 'Ricardo Fernández', rol: 'operador', areaId: 8, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 48, activo: true, posiciones: ['EC1'] },
        { id: 7, nombre: 'Rosa Martínez', rol: 'operador', areaId: 7, horaEntrada: '14:00', horaSalida: '22:00', horaComida: '18:00', salarioHora: 50, activo: true, posiciones: [] },
        { id: 8, nombre: 'Luis García', rol: 'operador', areaId: 4, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: [] },
        { id: 9, nombre: 'Roberto Domínguez', rol: 'operador', areaId: 5, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['CB1'] },
        { id: 10, nombre: 'Miguel Flores', rol: 'operador', areaId: 6, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: [] },
        { id: 11, nombre: 'Patricia Morales', rol: 'supervisora', areaId: null, horaEntrada: '07:30', horaSalida: '16:30', horaComida: '12:30', salarioHora: 80, activo: true, posiciones: [] },
        { id: 12, nombre: 'Roberto Díaz', rol: 'supervisora', areaId: null, horaEntrada: '14:00', horaSalida: '22:00', horaComida: '18:00', salarioHora: 80, activo: true, posiciones: [] },
        { id: 13, nombre: 'Fernando Castro', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['EX1'] },
        { id: 14, nombre: 'Javier Hernández', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C3'] },
        { id: 15, nombre: 'Laura Torres', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C4'] },
        { id: 16, nombre: 'Eduardo Reyes', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C5'] },
        { id: 17, nombre: 'Martha Ortiz', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C6'] },
        { id: 18, nombre: 'Sandra Juárez', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C9'] },
        { id: 19, nombre: 'José Moreno', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C10'] },
        { id: 20, nombre: 'Adriana Ríos', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['C13'] },
        { id: 21, nombre: 'Carmen Vargas', rol: 'operador', areaId: 8, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 48, activo: true, posiciones: ['EC2'] },
        { id: 22, nombre: 'Sergio Castillo', rol: 'operador', areaId: 8, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 48, activo: true, posiciones: ['EC3'] },
        { id: 23, nombre: 'Paula Mendoza', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['D1'] },
        { id: 24, nombre: 'Alfonso Luna', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', horaComida: '13:00', salarioHora: 50, activo: true, posiciones: ['CT1'] }
    ],

    // Pedidos (con precios de venta)
    pedidos: [
        {
            id: 1234,
            clienteId: 1,
            productos: [
                {
                    productoId: 1,
                    cantidad: 300,
                    completadas: 135,
                    precioUnitario: 85.00,
                    avanceProcesos: [
                        { procesoOrden: 1, nombre: 'Corte de espalda', completadas: 300, estado: 'completado' },
                        { procesoOrden: 2, nombre: 'Corte de frente', completadas: 300, estado: 'completado' },
                        { procesoOrden: 3, nombre: 'Preparación de piezas', completadas: 280, estado: 'completado' },
                        { procesoOrden: 4, nombre: 'Unión de hombros', completadas: 250, estado: 'completado' },
                        { procesoOrden: 5, nombre: 'Impresión de logotipo', completadas: 220, estado: 'completado' },
                        { procesoOrden: 6, nombre: 'Colocación de cuello', completadas: 200, estado: 'en_proceso' },
                        { procesoOrden: 7, nombre: 'Cerrado de costados', completadas: 180, estado: 'en_proceso' },
                        { procesoOrden: 8, nombre: 'Costura de ventana', completadas: 135, estado: 'en_proceso' },
                        { procesoOrden: 9, nombre: 'Doblado de bies', completadas: 50, estado: 'en_proceso' },
                        { procesoOrden: 10, nombre: 'Control de calidad', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 11, nombre: 'Empaque individual', completadas: 0, estado: 'pendiente' }
                    ]
                }
            ],
            prioridad: 'alta',
            fechaCarga: '2026-01-20',
            fechaEntrega: '2026-01-27',
            estado: 'produccion',
            notas: 'Cliente importante - entrega urgente',
            presupuestoEstimado: 18500,
            costoReal: 19450
        },
        {
            id: 1235,
            clienteId: 2,
            productos: [
                {
                    productoId: 2,
                    cantidad: 500,
                    completadas: 300,
                    precioUnitario: 125.00,
                    avanceProcesos: [
                        { procesoOrden: 1, nombre: 'Corte de tela principal', completadas: 500, estado: 'completado' },
                        { procesoOrden: 2, nombre: 'Corte de forro', completadas: 500, estado: 'completado' },
                        { procesoOrden: 3, nombre: 'Sublimación', completadas: 480, estado: 'completado' },
                        { procesoOrden: 4, nombre: 'Unión tela-forro', completadas: 450, estado: 'completado' },
                        { procesoOrden: 5, nombre: 'Costura de cierre', completadas: 400, estado: 'en_proceso' },
                        { procesoOrden: 6, nombre: 'Colocación de agarradera', completadas: 350, estado: 'en_proceso' },
                        { procesoOrden: 7, nombre: 'Costura decorativa', completadas: 300, estado: 'en_proceso' },
                        { procesoOrden: 8, nombre: 'Revisión', completadas: 200, estado: 'en_proceso' },
                        { procesoOrden: 9, nombre: 'Empaque', completadas: 100, estado: 'en_proceso' }
                    ]
                }
            ],
            prioridad: 'alta',
            fechaCarga: '2026-01-18',
            fechaEntrega: '2026-01-28',
            estado: 'produccion',
            notas: '',
            presupuestoEstimado: 42000,
            costoReal: 43800
        },
        {
            id: 1236,
            clienteId: 3,
            productos: [
                {
                    productoId: 3,
                    cantidad: 1000,
                    completadas: 800,
                    precioUnitario: 45.00,
                    avanceProcesos: [
                        { procesoOrden: 1, nombre: 'Corte de tela principal', completadas: 1000, estado: 'completado' },
                        { procesoOrden: 2, nombre: 'Corte de forro', completadas: 1000, estado: 'completado' },
                        { procesoOrden: 3, nombre: 'Costura base', completadas: 950, estado: 'completado' },
                        { procesoOrden: 4, nombre: 'Cerrado industrial', completadas: 900, estado: 'completado' },
                        { procesoOrden: 5, nombre: 'Revisión', completadas: 850, estado: 'en_proceso' },
                        { procesoOrden: 6, nombre: 'Empaque a granel', completadas: 800, estado: 'en_proceso' }
                    ]
                }
            ],
            prioridad: 'media',
            fechaCarga: '2026-01-15',
            fechaEntrega: '2026-01-29',
            estado: 'produccion',
            notas: '',
            presupuestoEstimado: 28000,
            costoReal: 27500
        },
        {
            id: 1237,
            clienteId: 1,
            productos: [
                {
                    productoId: 1,
                    cantidad: 200,
                    completadas: 50,
                    precioUnitario: 85.00,
                    avanceProcesos: [
                        { procesoOrden: 1, nombre: 'Corte de espalda', completadas: 200, estado: 'completado' },
                        { procesoOrden: 2, nombre: 'Corte de frente', completadas: 180, estado: 'completado' },
                        { procesoOrden: 3, nombre: 'Preparación de piezas', completadas: 150, estado: 'en_proceso' },
                        { procesoOrden: 4, nombre: 'Unión de hombros', completadas: 100, estado: 'en_proceso' },
                        { procesoOrden: 5, nombre: 'Impresión de logotipo', completadas: 80, estado: 'en_proceso' },
                        { procesoOrden: 6, nombre: 'Colocación de cuello', completadas: 50, estado: 'en_proceso' },
                        { procesoOrden: 7, nombre: 'Cerrado de costados', completadas: 50, estado: 'en_proceso' },
                        { procesoOrden: 8, nombre: 'Costura de ventana', completadas: 50, estado: 'en_proceso' },
                        { procesoOrden: 9, nombre: 'Doblado de bies', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 10, nombre: 'Control de calidad', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 11, nombre: 'Empaque individual', completadas: 0, estado: 'pendiente' }
                    ]
                }
            ],
            prioridad: 'media',
            fechaCarga: '2026-01-22',
            fechaEntrega: '2026-02-05',
            estado: 'produccion',
            notas: '',
            presupuestoEstimado: 12500,
            costoReal: 4200
        },
        {
            id: 1238,
            clienteId: 2,
            productos: [
                {
                    productoId: 2,
                    cantidad: 150,
                    completadas: 0,
                    precioUnitario: 125.00,
                    avanceProcesos: [
                        { procesoOrden: 1, nombre: 'Corte de tela principal', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 2, nombre: 'Corte de forro', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 3, nombre: 'Sublimación', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 4, nombre: 'Unión tela-forro', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 5, nombre: 'Costura de cierre', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 6, nombre: 'Colocación de agarradera', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 7, nombre: 'Costura decorativa', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 8, nombre: 'Revisión', completadas: 0, estado: 'pendiente' },
                        { procesoOrden: 9, nombre: 'Empaque', completadas: 0, estado: 'pendiente' }
                    ]
                }
            ],
            prioridad: 'baja',
            fechaCarga: '2026-01-25',
            fechaEntrega: '2026-02-15',
            estado: 'pendiente',
            notas: 'Nuevo pedido',
            presupuestoEstimado: 12600,
            costoReal: 0
        }
    ],

    // Producción en tiempo real (simulada)
    produccionActiva: [
        {
            id: 1,
            pedidoId: 1234,
            productoId: 1,
            procesoId: 8,
            operadorId: 1,
            inicio: '2026-01-26T08:00:00',
            piezasRealizadas: 45,
            pausas: [],
            estado: 'activo'
        },
        {
            id: 2,
            pedidoId: 1234,
            productoId: 1,
            procesoId: 9,
            operadorId: 2,
            inicio: '2026-01-26T08:30:00',
            piezasRealizadas: 38,
            pausas: [{ inicio: '10:15', fin: '10:25', motivo: 'Baño' }],
            estado: 'activo'
        },
        {
            id: 3,
            pedidoId: 1235,
            productoId: 2,
            procesoId: 10,
            operadorId: 7,
            inicio: '2026-01-26T14:00:00',
            piezasRealizadas: 22,
            pausas: [],
            estado: 'activo'
        }
    ],

    // Materiales
    materiales: [
        { id: 1, nombre: 'Tela no tejida 80g', unidad: 'metro', costo: 15.50, proveedor: 'Telas del Norte' },
        { id: 2, nombre: 'Tela no tejida 100g', unidad: 'metro', costo: 18.00, proveedor: 'Telas del Norte' },
        { id: 3, nombre: 'Cierre negro 1.48m', unidad: 'pieza', costo: 8.50, proveedor: 'Cierres México' },
        { id: 4, nombre: 'Cierre negro 1.70m', unidad: 'pieza', costo: 9.80, proveedor: 'Cierres México' },
        { id: 5, nombre: 'Bies (rollo 100m)', unidad: 'rollo', costo: 120.00, proveedor: 'Insumos Textiles' },
        { id: 6, nombre: 'Polipropileno 120g', unidad: 'metro', costo: 22.00, proveedor: 'Plásticos SA' }
    ],

    // BOM (Bill of Materials) por producto
    bom: [
        { productoId: 1, materialId: 1, cantidad: 1.2, unidad: 'metros' },
        { productoId: 1, materialId: 3, cantidad: 1, unidad: 'pieza' },
        { productoId: 1, materialId: 5, cantidad: 0.08, unidad: 'rollo' },
        { productoId: 2, materialId: 2, cantidad: 1.5, unidad: 'metros' },
        { productoId: 2, materialId: 4, cantidad: 1, unidad: 'pieza' },
        { productoId: 2, materialId: 5, cantidad: 0.09, unidad: 'rollo' },
        { productoId: 3, materialId: 6, cantidad: 0.8, unidad: 'metros' }
    ],

    // Bitácora de auditoría
    auditoria: [
        {
            id: 1,
            fecha: '2026-01-26T09:15:00',
            usuario: 'Admin',
            accion: 'Ajuste de cantidad',
            detalle: 'Pedido #1234: Ajuste de 320 a 300 piezas por supervisora',
            entidad: 'pedido',
            entidadId: 1234
        },
        {
            id: 2,
            fecha: '2026-01-25T14:30:00',
            usuario: 'Admin',
            accion: 'Cambio de tiempo estándar',
            detalle: 'Proceso "Costura de ventana": 3.2 min → 3.0 min',
            entidad: 'proceso',
            entidadId: 8
        }
    ],

    // Notificaciones (se generan dinámicamente basadas en datos reales)
    notificaciones: []
};

// ========================================
// FUNCIONES DE BASE DE DATOS
// ========================================

class Database {
    constructor() {
        this.data = this.load();
    }

    // Cargar datos de LocalStorage o inicializar
    load() {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            let data = JSON.parse(stored);
            let needsSave = false;

            // Migrar estructuras faltantes sin perder datos existentes
            if (!data.areasPlanta) {
                console.log('Migrando: agregando areasPlanta...');
                data.areasPlanta = initialData.areasPlanta;
                needsSave = true;
            }
            if (!data.estaciones) {
                console.log('Migrando: agregando estaciones...');
                data.estaciones = initialData.estaciones;
                needsSave = true;
            }
            if (!data.estadoOperadores) {
                console.log('Migrando: agregando estadoOperadores...');
                data.estadoOperadores = initialData.estadoOperadores;
                needsSave = true;
            }

            // Migrar estructura de personal (horarios)
            if (data.personal && data.personal[0] && !data.personal[0].horaEntrada) {
                console.log('Migrando: agregando horarios a personal...');
                data.personal = data.personal.map((p, i) => ({
                    ...p,
                    horaEntrada: initialData.personal[i]?.horaEntrada || '07:00',
                    horaSalida: initialData.personal[i]?.horaSalida || '15:30'
                }));
                needsSave = true;
            }

            // Migrar estructura de productos (rutaProcesos)
            if (data.productos && data.productos[0] && !data.productos[0].rutaProcesos) {
                console.log('Migrando: agregando rutaProcesos a productos...');
                data.productos = data.productos.map((p, i) => ({
                    ...p,
                    rutaProcesos: initialData.productos[i]?.rutaProcesos || [],
                    familiaId: initialData.productos[i]?.familiaId || null,
                    subfamiliaId: initialData.productos[i]?.subfamiliaId || null
                }));
                needsSave = true;
            }

            // Migrar notificaciones
            if (!data.notificaciones || !Array.isArray(data.notificaciones)) {
                console.log('Migrando: agregando notificaciones...');
                data.notificaciones = initialData.notificaciones || [];
                needsSave = true;
            }

            // Migrar familias y subfamilias
            if (!data.familias) {
                console.log('Migrando: agregando familias...');
                data.familias = initialData.familias;
                needsSave = true;
            }
            if (!data.subfamilias) {
                console.log('Migrando: agregando subfamilias...');
                data.subfamilias = initialData.subfamilias;
                needsSave = true;
            }

            // Migrar articulosFrecuentes en clientes
            if (data.clientes && data.clientes[0] && !data.clientes[0].articulosFrecuentes) {
                console.log('Migrando: agregando articulosFrecuentes a clientes...');
                data.clientes = data.clientes.map((c, i) => ({
                    ...c,
                    articulosFrecuentes: initialData.clientes[i]?.articulosFrecuentes || []
                }));
                needsSave = true;
            }

            // Migrar avanceProcesos en pedidos
            if (data.pedidos && data.pedidos[0] && data.pedidos[0].productos &&
                data.pedidos[0].productos[0] && !data.pedidos[0].productos[0].avanceProcesos) {
                console.log('Migrando: agregando avanceProcesos a pedidos...');
                data.pedidos = data.pedidos.map(pedido => ({
                    ...pedido,
                    productos: pedido.productos.map(prod => ({
                        ...prod,
                        avanceProcesos: prod.avanceProcesos || {}
                    }))
                }));
                needsSave = true;
            }

            if (needsSave) {
                this.save(data);
            }
            return data;
        }
        this.save(initialData);
        return initialData;
    }

    // Guardar datos en LocalStorage
    save(data = this.data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        this.data = data;
    }

    // Resetear a datos iniciales
    reset() {
        localStorage.removeItem(DB_KEY);
        this.data = initialData;
        this.save();
    }

    // ======== CLIENTES ========
    getClientes() {
        return this.data.clientes;
    }

    getCliente(id) {
        return this.data.clientes.find(c => c.id === id);
    }

    addCliente(cliente) {
        const newId = Math.max(...this.data.clientes.map(c => c.id), 0) + 1;
        cliente.id = newId;
        cliente.fechaAlta = new Date().toISOString().split('T')[0];
        this.data.clientes.push(cliente);
        this.save();
        this.addAuditoria('Nuevo cliente', `Cliente "${cliente.nombreComercial}" creado`, 'cliente', newId);
        return cliente;
    }

    updateCliente(id, updates) {
        const index = this.data.clientes.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.clientes[index] = { ...this.data.clientes[index], ...updates };
            this.save();
            this.addAuditoria('Cliente actualizado', `Cliente ID ${id} modificado`, 'cliente', id);
            return this.data.clientes[index];
        }
        return null;
    }

    deleteCliente(id) {
        const cliente = this.getCliente(id);
        this.data.clientes = this.data.clientes.filter(c => c.id !== id);
        this.save();
        if (cliente) {
            this.addAuditoria('Cliente eliminado', `Cliente "${cliente.nombreComercial}" eliminado`, 'cliente', id);
        }
    }

    // ======== PRODUCTOS ========
    getProductos() {
        return this.data.productos;
    }

    getProductosByCliente(clienteId) {
        return this.data.productos.filter(p => p.clienteId === clienteId);
    }

    getProducto(id) {
        const idNum = parseInt(id);
        return this.data.productos.find(p => p.id === idNum || p.id === id);
    }

    addProducto(producto) {
        const newId = Math.max(...this.data.productos.map(p => p.id), 0) + 1;
        producto.id = newId;
        producto.version = 1;
        producto.activo = true;
        this.data.productos.push(producto);
        this.save();
        this.addAuditoria('Nuevo producto', `Producto "${producto.nombre}" creado`, 'producto', newId);
        return producto;
    }

    updateProducto(id, updates) {
        const index = this.data.productos.findIndex(p => p.id === id);
        if (index !== -1) {
            // Incrementar versión si hay cambios significativos
            if (updates.procesos || updates.tiempoTotal) {
                updates.version = (this.data.productos[index].version || 1) + 1;
            }
            this.data.productos[index] = { ...this.data.productos[index], ...updates };
            this.save();
            this.addAuditoria('Producto actualizado', `Producto ID ${id} modificado (v${updates.version || this.data.productos[index].version})`, 'producto', id);
            return this.data.productos[index];
        }
        return null;
    }

    // ======== PEDIDOS ========
    getPedidos() {
        return this.data.pedidos;
    }

    getPedido(id) {
        return this.data.pedidos.find(p => p.id === id);
    }

    getPedidosByCliente(clienteId) {
        return this.data.pedidos.filter(p => p.clienteId === clienteId);
    }

    addPedido(pedido) {
        const newId = Math.max(...this.data.pedidos.map(p => p.id), 0) + 1;
        pedido.id = newId;
        pedido.estado = 'pendiente';
        pedido.fechaCarga = new Date().toISOString().split('T')[0];
        this.data.pedidos.push(pedido);
        this.save();
        this.addAuditoria('Nuevo pedido', `Pedido #${newId} creado para cliente ${pedido.clienteId}`, 'pedido', newId);
        return pedido;
    }

    updatePedido(id, updates) {
        const index = this.data.pedidos.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.pedidos[index] = { ...this.data.pedidos[index], ...updates };
            this.save();
            this.addAuditoria('Pedido actualizado', `Pedido #${id} modificado`, 'pedido', id);
            return this.data.pedidos[index];
        }
        return null;
    }

    deletePedido(id) {
        const pedido = this.getPedido(id);
        this.data.pedidos = this.data.pedidos.filter(p => p.id !== id);
        this.save();

        // También eliminar de pedidos_erp si existe
        try {
            const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
            const pedidosERPFiltrados = pedidosERP.filter(p => p.id != id);
            localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERPFiltrados));
        } catch (e) {
            console.warn('Error limpiando pedidos_erp:', e);
        }

        if (pedido) {
            this.addAuditoria('Pedido eliminado', `Pedido #${id} eliminado`, 'pedido', id);
        }
    }

    // ======== ÁREAS Y PROCESOS ========
    getAreas() {
        return this.data.areas;
    }

    getArea(id) {
        return this.data.areas.find(a => a.id === id);
    }

    getProcesos() {
        return this.data.procesos;
    }

    getProcesosByArea(areaId) {
        return this.data.procesos.filter(p => p.areaId === areaId);
    }

    getProceso(id) {
        return this.data.procesos.find(p => p.id === id);
    }

    addProceso(proceso) {
        const newId = Math.max(...this.data.procesos.map(p => p.id), 0) + 1;
        proceso.id = newId;
        this.data.procesos.push(proceso);
        this.save();
        this.addAuditoria('Nuevo proceso', `Proceso "${proceso.nombre}" creado en área ${proceso.areaId}`, 'proceso', newId);
        return proceso;
    }

    updateProceso(id, updates) {
        const index = this.data.procesos.findIndex(p => p.id === id);
        if (index !== -1) {
            const oldTiempo = this.data.procesos[index].tiempoEstandar;
            this.data.procesos[index] = { ...this.data.procesos[index], ...updates };
            this.save();
            if (updates.tiempoEstandar && updates.tiempoEstandar !== oldTiempo) {
                this.addAuditoria('Cambio de tiempo estándar', `Proceso ID ${id}: ${oldTiempo} min → ${updates.tiempoEstandar} min`, 'proceso', id);
            }
            return this.data.procesos[index];
        }
        return null;
    }

    deleteProceso(id) {
        const proceso = this.data.procesos.find(p => p.id === id);
        if (!proceso) return false;

        // Verificar si el proceso está siendo usado en alguna ruta de producto
        const productos = this.data.productos || [];
        const enUso = productos.some(prod =>
            prod.rutaProcesos && prod.rutaProcesos.some(rp => rp.procesoId === id)
        );

        if (enUso) {
            console.warn('No se puede eliminar el proceso, está en uso por uno o más productos');
            return false;
        }

        this.data.procesos = this.data.procesos.filter(p => p.id !== id);
        this.save();
        this.addAuditoria('Proceso eliminado', `Proceso "${proceso.nombre}" eliminado`, 'proceso', id);
        return true;
    }

    // ======== PERSONAL ========
    getPersonal() {
        return this.data.personal;
    }

    getPersonalByArea(areaId) {
        return this.data.personal.filter(p => p.areaId === areaId && p.activo);
    }

    getPersonalByRol(rol) {
        return this.data.personal.filter(p => p.rol === rol && p.activo);
    }

    getEmpleado(id) {
        return this.data.personal.find(p => p.id === id);
    }

    addEmpleado(empleado) {
        const newId = Math.max(...this.data.personal.map(p => p.id), 0) + 1;
        empleado.id = newId;
        empleado.activo = true;
        this.data.personal.push(empleado);
        this.save();
        this.addAuditoria('Nuevo empleado', `Empleado "${empleado.nombre}" agregado`, 'personal', newId);
        return empleado;
    }

    updateEmpleado(id, updates) {
        const index = this.data.personal.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.personal[index] = { ...this.data.personal[index], ...updates };
            this.save();
            console.log('Empleado actualizado:', id, updates);
            return this.data.personal[index];
        }
        console.warn('Empleado no encontrado:', id);
        return null;
    }

    // ======== MATERIALES ========
    getMateriales() {
        return this.data.materiales;
    }

    getMaterial(id) {
        return this.data.materiales.find(m => m.id === id);
    }

    addMaterial(material) {
        const newId = Math.max(...this.data.materiales.map(m => m.id), 0) + 1;
        material.id = newId;
        this.data.materiales.push(material);
        this.save();
        this.addAuditoria('Nuevo material', `Material "${material.nombre}" agregado`, 'material', newId);
        return material;
    }

    updateMaterial(id, updates) {
        const index = this.data.materiales.findIndex(m => m.id === id);
        if (index !== -1) {
            const oldCosto = this.data.materiales[index].costo;
            this.data.materiales[index] = { ...this.data.materiales[index], ...updates };
            this.save();
            if (updates.costo && updates.costo !== oldCosto) {
                this.addAuditoria('Cambio de costo material', `Material ID ${id}: $${oldCosto} → $${updates.costo}`, 'material', id);
            }
            return this.data.materiales[index];
        }
        return null;
    }

    // ======== BOM ========
    getBOM(productoId) {
        return this.data.bom.filter(b => b.productoId === productoId);
    }

    // ======== PRODUCCIÓN ========
    getProduccionActiva() {
        return this.data.produccionActiva;
    }

    // ======== AUDITORÍA ========
    getAuditoria() {
        return this.data.auditoria.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    addAuditoria(accion, detalle, entidad, entidadId) {
        const newId = Math.max(...this.data.auditoria.map(a => a.id), 0) + 1;
        this.data.auditoria.push({
            id: newId,
            fecha: new Date().toISOString(),
            usuario: 'Admin', // En producción, obtener del usuario logueado
            accion,
            detalle,
            entidad,
            entidadId
        });
        this.save();
    }

    // ======== NOTIFICACIONES ========
    getNotificaciones() {
        const notifs = this.data.notificaciones || [];
        return notifs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    getNotificacionesNoLeidas() {
        const notifs = this.data.notificaciones || [];
        return notifs.filter(n => !n.leida);
    }

    marcarNotificacionLeida(id) {
        if (!this.data.notificaciones) return;
        const index = this.data.notificaciones.findIndex(n => n.id === id);
        if (index !== -1) {
            this.data.notificaciones[index].leida = true;
            this.save();
        }
    }

    marcarTodasLeidas() {
        if (!this.data.notificaciones) return;
        this.data.notificaciones.forEach(n => n.leida = true);
        this.save();
    }

    addNotificacion(tipo, titulo, mensaje) {
        const newId = Math.max(...this.data.notificaciones.map(n => n.id), 0) + 1;
        this.data.notificaciones.push({
            id: newId,
            tipo,
            titulo,
            mensaje,
            fecha: new Date().toISOString(),
            leida: false
        });
        this.save();
    }

    // ======== ESTACIONES DE TRABAJO ========
    getEstaciones() {
        return this.data.estaciones || [];
    }

    getEstacionesByArea(areaPlantaId) {
        return (this.data.estaciones || []).filter(e => e.areaPlantaId === areaPlantaId);
    }

    getEstacion(id) {
        return (this.data.estaciones || []).find(e => e.id === id);
    }

    asignarOperadorAEstacion(estacionId, operadorId) {
        if (!this.data.estaciones) {
            console.warn('No hay estaciones definidas');
            return null;
        }
        const index = this.data.estaciones.findIndex(e => e.id === estacionId);
        if (index !== -1) {
            this.data.estaciones[index].operadorId = operadorId;
            this.save();
            console.log(`Estacion ${estacionId} asignada a operador ${operadorId}`);
            this.addAuditoria('Asignación de estación', `Operador ${operadorId} asignado a estación ${estacionId}`, 'estacion', estacionId);
            return this.data.estaciones[index];
        }
        return null;
    }

    // ======== ÁREAS DE PLANTA ========
    getAreasPlanta() {
        return this.data.areasPlanta || [];
    }

    getAreaPlanta(areaId) {
        return (this.data.areasPlanta || []).find(a => a.id === areaId);
    }

    addAreaPlanta(area) {
        if (!this.data.areasPlanta) this.data.areasPlanta = [];
        this.data.areasPlanta.push(area);
        this.save();
        this.addAuditoria('Nueva área de planta', `Área "${area.nombre}" creada con ${area.posiciones} posiciones`, 'areaPlanta', area.id);
        return area;
    }

    updateAreaPlanta(areaId, updates) {
        const index = (this.data.areasPlanta || []).findIndex(a => a.id === areaId);
        if (index !== -1) {
            this.data.areasPlanta[index] = { ...this.data.areasPlanta[index], ...updates };
            this.save();
            this.addAuditoria('Área de planta actualizada', `Área ${areaId} modificada`, 'areaPlanta', areaId);
            return this.data.areasPlanta[index];
        }
        return null;
    }

    deleteAreaPlanta(areaId) {
        const area = (this.data.areasPlanta || []).find(a => a.id === areaId);
        this.data.areasPlanta = (this.data.areasPlanta || []).filter(a => a.id !== areaId);
        // También eliminar las estaciones asociadas
        this.data.estaciones = (this.data.estaciones || []).filter(e => e.areaPlantaId !== areaId);
        this.save();
        if (area) {
            this.addAuditoria('Área de planta eliminada', `Área "${area.nombre}" eliminada`, 'areaPlanta', areaId);
        }
    }

    addEstacion(estacion) {
        if (!this.data.estaciones) this.data.estaciones = [];
        this.data.estaciones.push(estacion);
        this.save();
        console.log('Estación agregada:', estacion.id, '- Total estaciones:', this.data.estaciones.length);
        this.addAuditoria('Nueva estación', `Estación "${estacion.nombre}" creada en área ${estacion.areaPlantaId}`, 'estacion', estacion.id);
        return estacion;
    }

    deleteEstacion(estacionId) {
        if (!this.data.estaciones) return false;
        const estacion = this.data.estaciones.find(e => e.id === estacionId);
        if (!estacion) return false;

        // Verificar que no tenga operador asignado
        if (estacion.operadorId) {
            console.warn('No se puede eliminar estación con operador asignado');
            return false;
        }

        this.data.estaciones = this.data.estaciones.filter(e => e.id !== estacionId);

        // También eliminar cualquier estado de operador asociado
        if (this.data.estadoOperadores) {
            this.data.estadoOperadores = this.data.estadoOperadores.filter(e => e.estacionId !== estacionId);
        }

        this.save();
        this.addAuditoria('Estación eliminada', `Estación ${estacionId} eliminada`, 'estacion', estacionId);
        return true;
    }

    // ======== HISTORIAL DE PRODUCCIÓN ========
    getHistorialProduccion() {
        // Obtener del localStorage donde se guarda el historial
        const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
        return historial;
    }

    // ======== ESTADO DE OPERADORES (MAPA) ========
    getEstadoOperadores() {
        return this.data.estadoOperadores || [];
    }

    getEstadoOperador(operadorId) {
        return (this.data.estadoOperadores || []).find(e => e.operadorId === operadorId);
    }

    updateEstadoOperador(operadorId, updates) {
        const index = (this.data.estadoOperadores || []).findIndex(e => e.operadorId === operadorId);
        if (index !== -1) {
            this.data.estadoOperadores[index] = { ...this.data.estadoOperadores[index], ...updates };
            this.save();
            return this.data.estadoOperadores[index];
        }
        return null;
    }

    // ======== ESTADÍSTICAS DASHBOARD ========
    getEstadisticas() {
        const pedidosActivos = this.data.pedidos.filter(p => p.estado === 'produccion');
        const estadoOps = this.data.estadoOperadores || [];
        const operadoresActivos = estadoOps.filter(e => e.estado !== 'inactivo').length;

        let totalPiezasHoy = 0;
        (this.data.produccionActiva || []).forEach(p => {
            totalPiezasHoy += p.piezasRealizadas;
        });

        return {
            piezasHora: Math.round(totalPiezasHoy / 4),
            procesosActivos: (this.data.produccionActiva || []).length,
            operadoresActivos: operadoresActivos,
            wipTotal: pedidosActivos.reduce((sum, p) => {
                return sum + p.productos.reduce((s, pr) => s + (pr.cantidad - pr.completadas), 0);
            }, 0)
        };
    }

    // ======== ESTADÍSTICAS DEL DASHBOARD EJECUTIVO ========
    getDashboardStats(periodo = 'month') {
        const pedidos = this.data.pedidos || [];
        // Pedidos activos = todos los que NO estén entregados, cancelados o anulados
        const estadosInactivos = ['entregado', 'cancelado', 'anulado', 'completado'];
        const pedidosActivos = pedidos.filter(p => {
            const estado = (p.estado || 'pendiente').toLowerCase().trim();
            return !estadosInactivos.includes(estado);
        });
        const estadoOps = this.data.estadoOperadores || [];
        const estaciones = this.data.estaciones || [];

        // Clientes activos (con pedidos activos - pendientes o en producción)
        const clientesActivos = [...new Set(pedidosActivos.map(p => p.clienteId))].length;

        // Operadores activos
        const operadoresActivos = estadoOps.filter(e => e.estado !== 'inactivo').length;

        // Procesos activos
        const procesosActivos = (this.data.produccionActiva || []).length;

        // Venta total en fabricación (suma de precio * cantidad de todos los pedidos activos)
        let ventaTotal = 0;
        const catalogoProductos = this.data.productos || [];
        pedidosActivos.forEach(pedido => {
            const productosArr = pedido.productos || [];
            productosArr.forEach(prod => {
                // Buscar precio: primero en el pedido, luego en el catálogo
                let precio = prod.precioUnitario || 0;
                if (precio === 0 && prod.productoId) {
                    const prodCatalogo = catalogoProductos.find(p => p.id === prod.productoId);
                    precio = prodCatalogo?.precioVenta || 0;
                }
                ventaTotal += (prod.cantidad || 0) * precio;
            });
        });

        // Efectividad promedio
        const efectividades = estadoOps.filter(e => e.efectividad > 0).map(e => e.efectividad);
        const efectividadPromedio = efectividades.length > 0
            ? efectividades.reduce((a, b) => a + b, 0) / efectividades.length
            : 0;

        // % vs Presupuesto
        let totalPresupuesto = 0;
        let totalCostoReal = 0;
        pedidosActivos.forEach(pedido => {
            totalPresupuesto += pedido.presupuestoEstimado || 0;
            totalCostoReal += pedido.costoReal || 0;
        });
        const vsPresupuesto = totalPresupuesto > 0
            ? ((totalCostoReal - totalPresupuesto) / totalPresupuesto) * 100
            : 0;

        // Resumen de estados del mapa
        const resumenEstados = {
            adelantados: estadoOps.filter(e => e.estado === 'adelantado').length,
            onPace: estadoOps.filter(e => e.estado === 'on-pace').length,
            retrasados: estadoOps.filter(e => e.estado === 'retrasado' || e.estado === 'muy-retrasado').length,
            sinAsignar: estaciones.filter(e => e.operadorId === null).length
        };

        return {
            procesosActivos,
            clientesActivos,
            operadoresActivos,
            ventaTotal,
            efectividadPromedio: Math.round(efectividadPromedio * 10) / 10,
            vsPresupuesto: Math.round(vsPresupuesto * 10) / 10,
            resumenEstados
        };
    }

    // ======== DATOS PARA MAPA DE PLANTA ========
    getMapaPlantaData() {
        const areasPlanta = this.data.areasPlanta || [];
        const estaciones = this.data.estaciones || [];
        const estadoOps = this.data.estadoOperadores || [];
        const personal = this.data.personal || [];

        // Helper para obtener iniciales
        const getIniciales = (nombre) => {
            if (!nombre) return '??';
            const partes = nombre.split(' ');
            if (partes.length >= 2) {
                return (partes[0][0] + partes[1][0]).toUpperCase();
            }
            return nombre.substring(0, 2).toUpperCase();
        };

        return areasPlanta.map(area => {
            const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);

            const posiciones = estacionesArea.map(estacion => {
                const estadoOp = estadoOps.find(e => e.estacionId === estacion.id);
                const operador = estacion.operadorId ? personal.find(p => p.id === estacion.operadorId) : null;

                // Obtener iniciales de estadoOp, o generarlas del operador si existe
                let iniciales = null;
                if (estadoOp && estadoOp.iniciales) {
                    iniciales = estadoOp.iniciales;
                } else if (operador) {
                    iniciales = getIniciales(operador.nombre);
                }

                return {
                    id: estacion.id,
                    nombre: estacion.nombre,
                    operadorId: estacion.operadorId,
                    operadorNombre: operador ? operador.nombre : null,
                    iniciales: iniciales,
                    estado: estadoOp ? estadoOp.estado : (operador ? 'inactivo' : 'empty'),
                    efectividad: estadoOp ? estadoOp.efectividad : 0
                };
            });

            return {
                id: area.id,
                nombre: area.nombre,
                color: area.color,
                posiciones
            };
        });
    }

    // ======== FAMILIAS Y SUBFAMILIAS ========
    getFamilias() {
        return this.data.familias || [];
    }

    getFamilia(id) {
        return (this.data.familias || []).find(f => f.id === id);
    }

    addFamilia(familia) {
        if (!this.data.familias) this.data.familias = [];
        const newId = Math.max(...this.data.familias.map(f => f.id), 0) + 1;
        familia.id = newId;
        this.data.familias.push(familia);
        this.save();
        return familia;
    }

    updateFamilia(id, updates) {
        const index = (this.data.familias || []).findIndex(f => f.id === id);
        if (index === -1) return null;
        this.data.familias[index] = { ...this.data.familias[index], ...updates };
        this.save();
        return this.data.familias[index];
    }

    deleteFamilia(id) {
        if (!this.data.familias) return false;
        const index = this.data.familias.findIndex(f => f.id === id);
        if (index === -1) return false;
        this.data.familias.splice(index, 1);
        this.save();
        return true;
    }

    getSubfamilias() {
        return this.data.subfamilias || [];
    }

    getSubfamiliasByFamilia(familiaId) {
        return (this.data.subfamilias || []).filter(s => s.familiaId === familiaId);
    }

    getSubfamilia(id) {
        return (this.data.subfamilias || []).find(s => s.id === id);
    }

    addSubfamilia(subfamilia) {
        if (!this.data.subfamilias) this.data.subfamilias = [];
        const newId = Math.max(...this.data.subfamilias.map(s => s.id), 0) + 1;
        subfamilia.id = newId;
        this.data.subfamilias.push(subfamilia);
        this.save();
        return subfamilia;
    }

    updateSubfamilia(id, updates) {
        const index = (this.data.subfamilias || []).findIndex(s => s.id === id);
        if (index === -1) return null;
        this.data.subfamilias[index] = { ...this.data.subfamilias[index], ...updates };
        this.save();
        return this.data.subfamilias[index];
    }

    deleteSubfamilia(id) {
        if (!this.data.subfamilias) return false;
        const index = this.data.subfamilias.findIndex(s => s.id === id);
        if (index === -1) return false;
        this.data.subfamilias.splice(index, 1);
        this.save();
        return true;
    }

    getProductosByFamilia(familiaId) {
        return this.data.productos.filter(p => p.familiaId === familiaId);
    }

    getProductosBySubfamilia(subfamiliaId) {
        return this.data.productos.filter(p => p.subfamiliaId === subfamiliaId);
    }

    // ======== INVENTARIO DE PIEZAS INTERMEDIAS ========
    // Para piezas que se pre-producen (ej: ventanas cortadas)

    getInventarioPiezas() {
        if (!this.data.inventarioPiezas) {
            this.data.inventarioPiezas = [];
        }
        return this.data.inventarioPiezas;
    }

    getInventarioPieza(id) {
        return this.getInventarioPiezas().find(p => p.id === id);
    }

    getInventarioPiezaByProductoProceso(productoId, procesoNombre) {
        // Normalizar para comparación flexible
        const productoIdStr = String(productoId);
        const procesoNombreLower = (procesoNombre || '').toLowerCase().trim();

        return this.getInventarioPiezas().find(p => {
            const pProductoIdStr = String(p.productoId);
            const pProcesoNombreLower = (p.procesoNombre || '').toLowerCase().trim();

            // Comparar productoId como string y procesoNombre case-insensitive
            return pProductoIdStr === productoIdStr && pProcesoNombreLower === procesoNombreLower;
        });
    }

    getInventarioPiezasByProducto(productoId) {
        return this.getInventarioPiezas().filter(p => p.productoId === productoId);
    }

    addInventarioPieza(pieza) {
        if (!this.data.inventarioPiezas) {
            this.data.inventarioPiezas = [];
        }
        const newId = Math.max(...this.data.inventarioPiezas.map(p => p.id), 0) + 1;
        const nuevaPieza = {
            id: newId,
            productoId: pieza.productoId,
            procesoNombre: pieza.procesoNombre,
            descripcion: pieza.descripcion || '',
            cantidadDisponible: pieza.cantidadDisponible || 0,
            cantidadMinima: pieza.cantidadMinima || 0,
            unidad: pieza.unidad || 'pzas',
            esPreproducible: true,
            ultimaActualizacion: new Date().toISOString(),
            historialMovimientos: []
        };
        this.data.inventarioPiezas.push(nuevaPieza);
        this.save();
        return nuevaPieza;
    }

    updateInventarioPieza(id, updates) {
        const index = this.getInventarioPiezas().findIndex(p => p.id === id);
        if (index === -1) return null;
        this.data.inventarioPiezas[index] = {
            ...this.data.inventarioPiezas[index],
            ...updates,
            ultimaActualizacion: new Date().toISOString()
        };
        this.save();
        return this.data.inventarioPiezas[index];
    }

    deleteInventarioPieza(id) {
        if (!this.data.inventarioPiezas) return false;
        const index = this.data.inventarioPiezas.findIndex(p => p.id === id);
        if (index === -1) return false;
        this.data.inventarioPiezas.splice(index, 1);
        this.save();
        return true;
    }

    // Agregar piezas al inventario (cuando se pre-producen)
    agregarPiezasInventario(id, cantidad, motivo, pedidoId = null) {
        const pieza = this.getInventarioPieza(id);
        if (!pieza) return null;

        const movimiento = {
            fecha: new Date().toISOString(),
            tipo: 'entrada',
            cantidad: cantidad,
            motivo: motivo,
            pedidoId: pedidoId,
            saldoAnterior: pieza.cantidadDisponible,
            saldoNuevo: pieza.cantidadDisponible + cantidad
        };

        pieza.cantidadDisponible += cantidad;
        pieza.historialMovimientos = pieza.historialMovimientos || [];
        pieza.historialMovimientos.unshift(movimiento);
        pieza.ultimaActualizacion = new Date().toISOString();

        this.save();
        return pieza;
    }

    // Descontar piezas del inventario (cuando se usan en producción)
    descontarPiezasInventario(id, cantidad, motivo, pedidoId = null) {
        const pieza = this.getInventarioPieza(id);
        if (!pieza) return null;
        if (pieza.cantidadDisponible < cantidad) {
            return { error: 'Cantidad insuficiente', disponible: pieza.cantidadDisponible };
        }

        const movimiento = {
            fecha: new Date().toISOString(),
            tipo: 'salida',
            cantidad: cantidad,
            motivo: motivo,
            pedidoId: pedidoId,
            saldoAnterior: pieza.cantidadDisponible,
            saldoNuevo: pieza.cantidadDisponible - cantidad
        };

        pieza.cantidadDisponible -= cantidad;
        pieza.historialMovimientos = pieza.historialMovimientos || [];
        pieza.historialMovimientos.unshift(movimiento);
        pieza.ultimaActualizacion = new Date().toISOString();

        this.save();
        return pieza;
    }

    // Verificar disponibilidad de piezas para un producto
    verificarDisponibilidadPiezas(productoId) {
        const piezas = this.getInventarioPiezasByProducto(productoId);
        return piezas.map(p => ({
            id: p.id,
            procesoNombre: p.procesoNombre,
            descripcion: p.descripcion,
            disponible: p.cantidadDisponible,
            minimo: p.cantidadMinima,
            alertaBaja: p.cantidadDisponible <= p.cantidadMinima
        }));
    }

    // ======== ARTÍCULOS FRECUENTES DE CLIENTES ========
    getArticulosFrecuentes(clienteId) {
        const cliente = this.getCliente(clienteId);
        return cliente ? (cliente.articulosFrecuentes || []) : [];
    }

    addArticuloFrecuente(clienteId, articulo) {
        const index = this.data.clientes.findIndex(c => c.id === clienteId);
        if (index === -1) return null;

        if (!this.data.clientes[index].articulosFrecuentes) {
            this.data.clientes[index].articulosFrecuentes = [];
        }

        // Verificar si ya existe
        const existente = this.data.clientes[index].articulosFrecuentes.find(a => a.productoId === articulo.productoId);
        if (existente) {
            // Actualizar
            existente.notas = articulo.notas;
            existente.ultimoPrecio = articulo.ultimoPrecio;
        } else {
            this.data.clientes[index].articulosFrecuentes.push(articulo);
        }

        this.save();
        this.addAuditoria('Artículo frecuente agregado', `Cliente ${clienteId}: Producto ${articulo.productoId}`, 'cliente', clienteId);
        return articulo;
    }

    removeArticuloFrecuente(clienteId, productoId) {
        const index = this.data.clientes.findIndex(c => c.id === clienteId);
        if (index === -1) return;

        if (this.data.clientes[index].articulosFrecuentes) {
            this.data.clientes[index].articulosFrecuentes = this.data.clientes[index].articulosFrecuentes.filter(a => a.productoId !== productoId);
            this.save();
        }
    }
}

// ========================================
// CONFIGURACIÓN DEL SISTEMA
// ========================================

const CONFIG_SISTEMA_DEFAULT = {
    autenticacion: {
        requierePIN: true,
        longitudPIN: 4,
        intentosMaximos: 3,
        bloqueoTemporal: 15, // minutos
        sesionExpira: 480 // minutos (8 horas)
    },
    motivosPausa: [
        { id: 'bano', nombre: 'Baño', icono: 'fa-restroom', color: '#3b82f6', activo: true, detieneTiempo: false, notificaCoco: false },
        { id: 'comida', nombre: 'Comida', icono: 'fa-utensils', color: '#10b981', activo: true, detieneTiempo: true, notificaCoco: false },
        { id: 'descanso', nombre: 'Descanso', icono: 'fa-coffee', color: '#f59e0b', activo: true, detieneTiempo: false, notificaCoco: false },
        { id: 'sin_material', nombre: 'Sin Material', icono: 'fa-box-open', color: '#ef4444', activo: true, detieneTiempo: true, notificaCoco: true },
        { id: 'maquina', nombre: 'Problema de Máquina', icono: 'fa-tools', color: '#dc2626', activo: true, detieneTiempo: true, notificaCoco: true },
        { id: 'instrucciones', nombre: 'Necesito Instrucciones', icono: 'fa-question-circle', color: '#8b5cf6', activo: true, detieneTiempo: true, notificaCoco: true },
        { id: 'calidad', nombre: 'Problema de Calidad', icono: 'fa-exclamation-triangle', color: '#f97316', activo: true, detieneTiempo: true, notificaCoco: true },
        { id: 'personal', nombre: 'Asunto Personal', icono: 'fa-user', color: '#6b7280', activo: true, detieneTiempo: false, notificaCoco: false }
    ],
    produccion: {
        alertaInactividad: 30, // minutos
        metaMinimaPorHora: 10, // piezas
        toleranciaExceso: 5, // % sobre meta
        requiereFotoDefecto: true
    },
    notificaciones: {
        sonidoActivo: true,
        notificarPausaLarga: true,
        tiempoPausaLarga: 15, // minutos
        notificarInactividad: true
    },
    roles: {
        administrador: {
            nombre: 'Administrador',
            descripcion: 'Acceso completo al sistema',
            permisos: ['todo']
        },
        supervisora: {
            nombre: 'Supervisora',
            descripcion: 'Gestión de producción y personal',
            permisos: ['ver_dashboard', 'ver_personal', 'asignar_tareas', 'ver_reportes', 'gestionar_pausas']
        },
        operador: {
            nombre: 'Operador',
            descripcion: 'Captura de producción',
            permisos: ['capturar_produccion', 'reportar_problemas', 'ver_propias_estadisticas']
        }
    }
};

// Funciones de configuración del sistema
function getConfigSistema() {
    const saved = localStorage.getItem('config_sistema');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            // Merge con defaults para asegurar que nuevos campos existan
            return {
                ...CONFIG_SISTEMA_DEFAULT,
                ...config,
                autenticacion: { ...CONFIG_SISTEMA_DEFAULT.autenticacion, ...config.autenticacion },
                produccion: { ...CONFIG_SISTEMA_DEFAULT.produccion, ...config.produccion },
                notificaciones: { ...CONFIG_SISTEMA_DEFAULT.notificaciones, ...config.notificaciones },
                motivosPausa: config.motivosPausa || CONFIG_SISTEMA_DEFAULT.motivosPausa
            };
        } catch (e) {
            return CONFIG_SISTEMA_DEFAULT;
        }
    }
    return CONFIG_SISTEMA_DEFAULT;
}

function setConfigSistema(config) {
    localStorage.setItem('config_sistema', JSON.stringify(config));
    // Sincronizar con panel de operadora
    sincronizarConfigOperadora();
}

function getMotivoPausa(motivoId) {
    const config = getConfigSistema();
    return config.motivosPausa.find(m => m.id === motivoId);
}

function getMotivosActivos() {
    const config = getConfigSistema();
    return config.motivosPausa.filter(m => m.activo);
}

function updateMotivoPausa(motivoId, updates) {
    const config = getConfigSistema();
    const index = config.motivosPausa.findIndex(m => m.id === motivoId);
    if (index !== -1) {
        config.motivosPausa[index] = { ...config.motivosPausa[index], ...updates };
        setConfigSistema(config);
        return config.motivosPausa[index];
    }
    return null;
}

function addMotivoPausa(motivo) {
    const config = getConfigSistema();
    const newId = motivo.id || 'custom_' + Date.now();
    const nuevoMotivo = {
        id: newId,
        nombre: motivo.nombre,
        icono: motivo.icono || 'fa-pause',
        color: motivo.color || '#6b7280',
        activo: true,
        detieneTiempo: motivo.detieneTiempo || false,
        notificaCoco: motivo.notificaCoco || false
    };
    config.motivosPausa.push(nuevoMotivo);
    setConfigSistema(config);
    return nuevoMotivo;
}

function deleteMotivoPausa(motivoId) {
    const config = getConfigSistema();
    config.motivosPausa = config.motivosPausa.filter(m => m.id !== motivoId);
    setConfigSistema(config);
}

// Sincronizar configuración con panel de operadora
function sincronizarConfigOperadora() {
    const config = getConfigSistema();
    localStorage.setItem('config_operadora_sync', JSON.stringify({
        motivosPausa: config.motivosPausa,
        produccion: config.produccion,
        notificaciones: config.notificaciones,
        lastSync: new Date().toISOString()
    }));
}

// Sincronizar base de datos de operadoras
function sincronizarOperadorasDB() {
    const personal = db.getPersonal();
    const operadoras = personal
        .filter(p => p.rol === 'operador' && p.activo)
        .map(p => ({
            id: p.id,
            numEmpleado: p.numEmpleado || String(100 + p.id),
            pin: p.pin || '1234',
            nombre: p.nombre,
            area: getAreaPlantaFromAreaId(p.areaId),
            foto: p.foto || null,
            bloqueado: p.bloqueado || false,
            permisos: p.permisos || {}
        }));

    localStorage.setItem('operadoras_db', JSON.stringify(operadoras));
    return operadoras;
}

// Helper para convertir areaId a área de planta
function getAreaPlantaFromAreaId(areaId) {
    const areasMap = {
        1: 'corte', // Corte Volumen
        2: 'corte', // Corte a Medida
        3: 'serigrafia',
        4: 'corte', // Corte Cierre
        5: 'cortebies',
        6: 'costura', // Costura Fundas
        7: 'costura', // Costura Volumen
        8: 'empaque' // Calidad y Empaque
    };
    return areasMap[areaId] || 'costura';
}

// Generar PIN aleatorio
function generarPINAleatorio(longitud = 4) {
    let pin = '';
    for (let i = 0; i < longitud; i++) {
        pin += Math.floor(Math.random() * 10);
    }
    return pin;
}

// Generar número de empleado
function generarNumEmpleado() {
    const personal = db.getPersonal();
    const maxNum = personal.reduce((max, p) => {
        const num = parseInt(p.numEmpleado || '100');
        return num > max ? num : max;
    }, 100);
    return String(maxNum + 1);
}

// Instancia global de la base de datos
const db = new Database();

// ========================================
// FUNCIONES DE SINCRONIZACIÓN ENTRE PANELES
// Admin <-> Supervisora <-> Operadora
// ========================================

/**
 * Sincroniza personal con operadoras_db para login de operadoras
 * LLAMAR: Después de crear/editar/eliminar empleado en Admin
 */
function sincronizarOperadorasParaLogin() {
    const personal = db.getPersonal();

    const operadoras = personal
        .filter(p => p.activo !== false)
        .filter(p => ['operador', 'operadora', 'supervisora', 'supervisor'].includes((p.rol || '').toLowerCase()))
        .map(p => ({
            id: p.id,
            numEmpleado: p.numEmpleado || String(100 + p.id),
            pin: p.pin || '1234',
            nombre: p.nombre,
            area: obtenerNombreAreaParaSync(p.areaId),
            foto: p.foto || null,
            permisos: p.permisos || {},
            horaEntrada: p.horaEntrada || '08:00',
            horaSalida: p.horaSalida || '17:00',
            bloqueado: p.bloqueado || false,
            rol: p.rol || 'operador'
        }));

    localStorage.setItem('operadoras_db', JSON.stringify(operadoras));
    console.log('[SYNC] operadoras_db actualizado:', operadoras.length, 'usuarios');
    return operadoras;
}

function obtenerNombreAreaParaSync(areaId) {
    if (!areaId) return 'general';
    const areas = db.getAreas();
    const area = areas.find(a => a.id === areaId);
    return area?.nombre?.toLowerCase().replace(/\s+/g, '') || 'general';
}

/**
 * Sincroniza pedidos activos para que Operadora los pueda ver
 * LLAMAR: Después de crear pedido o cambiar su estado
 */
function sincronizarPedidosParaOperadoras() {
    const pedidos = db.getPedidos();

    const activos = pedidos.filter(p =>
        ['produccion', 'en_proceso', 'pendiente', 'activo', 'en proceso'].includes((p.estado || '').toLowerCase())
    ).map(p => {
        // Extraer procesos de todas las fuentes posibles
        let procesos = [];

        // Fuente 1: productos[].avanceProcesos (estructura principal del ERP)
        if (p.productos && p.productos.length > 0) {
            p.productos.forEach((prod, prodIdx) => {
                if (prod.avanceProcesos && Array.isArray(prod.avanceProcesos)) {
                    prod.avanceProcesos.forEach((proc, procIdx) => {
                        procesos.push({
                            id: proc.id || proc.procesoId || `${p.id}-${prod.productoId || prodIdx}-${procIdx}`,
                            nombre: proc.nombre || proc.procesoNombre || 'Proceso',
                            tipo: proc.tipo || 'produccion',
                            estado: proc.estado || 'pendiente',
                            piezas: proc.piezas || proc.completadas || 0,
                            orden: proc.orden || procIdx + 1,
                            productoId: prod.productoId,
                            pedidoId: p.id
                        });
                    });
                }
            });
        }

        // Fuente 2: p.procesos directo (si existe)
        if (procesos.length === 0 && p.procesos && Array.isArray(p.procesos)) {
            procesos = p.procesos.map((proc, idx) => ({
                id: proc.id || proc.procesoId || `${p.id}-proc-${idx}`,
                nombre: proc.nombre || proc.procesoNombre || 'Proceso',
                tipo: proc.tipo || 'produccion',
                estado: proc.estado || 'pendiente',
                piezas: proc.piezas || proc.completadas || 0,
                orden: proc.orden || idx + 1,
                pedidoId: p.id
            }));
        }

        // Fuente 3: Generar desde rutaProcesos del producto
        if (procesos.length === 0 && p.productos && p.productos.length > 0) {
            p.productos.forEach((prod, prodIdx) => {
                const productoCompleto = db.getProducto(parseInt(prod.productoId));
                if (productoCompleto && productoCompleto.rutaProcesos && productoCompleto.rutaProcesos.length > 0) {
                    productoCompleto.rutaProcesos.forEach((proc, procIdx) => {
                        if (proc.habilitado !== false && proc.nombre) {
                            procesos.push({
                                id: `${p.id}-${prod.productoId}-${procIdx}`,
                                nombre: proc.nombre,
                                tipo: proc.tipo || 'produccion',
                                estado: 'pendiente',
                                piezas: 0,
                                orden: proc.orden || procIdx + 1,
                                productoId: prod.productoId,
                                pedidoId: p.id
                            });
                        }
                    });
                }
            });
        }

        return {
            id: p.id,
            codigo: p.codigo || `PED-${p.id}`,
            cliente: p.clienteNombre || obtenerNombreClienteSync(p.clienteId),
            producto: p.productoNombre || p.descripcion || 'Producto',
            cantidad: p.cantidad || p.cantidadTotal || 0,
            estado: p.estado,
            prioridad: p.prioridad || 'normal',
            fechaEntrega: p.fechaEntrega,
            imagen: p.imagen || null,
            procesos: procesos
        };
    });

    localStorage.setItem('pedidos_activos', JSON.stringify(activos));

    // IMPORTANTE: También sincronizar a pedidos_erp para las operadoras
    // Solo actualizar pedidos que no existen o que tienen menos procesos
    const pedidosERPExistentes = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');

    activos.forEach(pedidoActivo => {
        const existenteIdx = pedidosERPExistentes.findIndex(pe => pe.id == pedidoActivo.id);

        if (existenteIdx === -1) {
            // No existe, agregar
            pedidosERPExistentes.push(pedidoActivo);
            console.log('[SYNC] Pedido agregado a pedidos_erp:', pedidoActivo.id);
        } else {
            // Existe, solo actualizar si el existente no tiene procesos o tiene menos
            const existente = pedidosERPExistentes[existenteIdx];
            if (!existente.procesos || existente.procesos.length === 0) {
                // No tiene procesos, reemplazar pero conservar piezas si las hay
                pedidosERPExistentes[existenteIdx] = pedidoActivo;
                console.log('[SYNC] Pedido actualizado en pedidos_erp (sin procesos previos):', pedidoActivo.id);
            } else {
                // Tiene procesos, solo sincronizar los que faltan y preservar piezas
                pedidoActivo.procesos.forEach(procNuevo => {
                    const procExistenteIdx = existente.procesos.findIndex(pe => pe.id == procNuevo.id);
                    if (procExistenteIdx === -1) {
                        // Proceso no existe, agregar
                        existente.procesos.push(procNuevo);
                    }
                    // Si ya existe, no modificar para preservar las piezas registradas por el operador
                });
            }
        }
    });

    localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERPExistentes));
    console.log('[SYNC] pedidos_activos actualizado:', activos.length, 'pedidos');
    console.log('[SYNC] pedidos_erp sincronizado:', pedidosERPExistentes.length, 'pedidos');

    return activos;
}

function obtenerNombreClienteSync(clienteId) {
    if (!clienteId) return 'Cliente';
    const clientes = db.getClientes();
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nombre || 'Cliente';
}

/**
 * Obtiene notificaciones pendientes enviadas por operadoras
 * USAR: Desde Supervisora para ver alertas
 */
function obtenerNotificacionesDeOperadoras() {
    return JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
}

/**
 * Marca una notificación como leída
 */
function marcarNotificacionComoLeida(notifId) {
    const notifs = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    const notif = notifs.find(n => n.id === notifId);
    if (notif) {
        notif.leida = true;
        notif.fechaLeida = new Date().toISOString();
        localStorage.setItem('notificaciones_coco', JSON.stringify(notifs));
    }
}

/**
 * Envía un mensaje de Coco a las operadoras
 * @param {string} mensaje - Texto del mensaje
 * @param {string|number} destinatarioId - 'todos' o ID específico de operadora
 */
function enviarMensajeDeCocoAOperadoras(mensaje, destinatarioId = 'todos') {
    const mensajes = JSON.parse(localStorage.getItem('mensajes_operadoras') || '[]');

    const nuevoMensaje = {
        id: Date.now(),
        texto: mensaje,
        destinatarioId: destinatarioId,
        remitente: 'Coco',
        fecha: new Date().toISOString(),
        leido: false,
        leidoPor: []
    };

    mensajes.unshift(nuevoMensaje);

    // Mantener máximo 100 mensajes
    const mensajesRecortados = mensajes.slice(0, 100);

    localStorage.setItem('mensajes_operadoras', JSON.stringify(mensajesRecortados));
    console.log('[SYNC] Mensaje enviado a operadoras');
    return nuevoMensaje;
}

/**
 * Obtiene la producción del día de todas las operadoras
 * USAR: Desde Supervisora para ver avance
 */
function obtenerProduccionDelDia() {
    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const hoy = new Date().toISOString().split('T')[0];

    return historial.filter(h => h.fecha && h.fecha.startsWith(hoy));
}

/**
 * Obtiene los tiempos muertos activos y del día
 */
function obtenerTiemposMuertos() {
    return JSON.parse(localStorage.getItem('tiempos_muertos') || '{"activos":{},"historial":[]}');
}

/**
 * Asigna un pedido a una estación
 * @param {string} estacionId - ID de la estación
 * @param {number} pedidoId - ID del pedido
 * @param {number|null} procesoId - ID del proceso específico (opcional)
 * @param {number} meta - Meta de piezas para esta asignación
 */
function asignarPedidoAEstacion(estacionId, pedidoId, procesoId = null, meta = 100) {
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    asignaciones[estacionId] = {
        pedidoId: pedidoId,
        procesoId: procesoId,
        meta: meta,
        fechaAsignacion: new Date().toISOString(),
        asignadoPor: 'Admin'
    };

    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    console.log('[SYNC] Pedido', pedidoId, 'asignado a estación', estacionId);
    return asignaciones[estacionId];
}

/**
 * Libera una estación de su pedido asignado
 */
function liberarEstacionDePedido(estacionId) {
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    delete asignaciones[estacionId];
    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));

    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    if (estadoMaquinas[estacionId]) {
        estadoMaquinas[estacionId].estado = 'disponible';
        estadoMaquinas[estacionId].pedidoId = null;
    }
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    console.log('[SYNC] Estación', estacionId, 'liberada');
}

/**
 * Obtiene todas las asignaciones actuales
 */
function obtenerAsignacionesActuales() {
    return JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
}

/**
 * Ejecuta sincronización completa de todos los datos
 * LLAMAR: Al iniciar la aplicación admin
 */
function ejecutarSincronizacionCompleta() {
    console.log('[SYNC] Iniciando sincronización completa...');
    sincronizarOperadorasParaLogin();
    sincronizarPedidosParaOperadoras();
    console.log('[SYNC] Sincronización completa terminada');
}

// Exponer funciones globalmente
window.sincronizarOperadorasParaLogin = sincronizarOperadorasParaLogin;
window.sincronizarPedidosParaOperadoras = sincronizarPedidosParaOperadoras;
window.obtenerNotificacionesDeOperadoras = obtenerNotificacionesDeOperadoras;
window.marcarNotificacionComoLeida = marcarNotificacionComoLeida;
window.enviarMensajeDeCocoAOperadoras = enviarMensajeDeCocoAOperadoras;
window.obtenerProduccionDelDia = obtenerProduccionDelDia;
window.obtenerTiemposMuertos = obtenerTiemposMuertos;
window.asignarPedidoAEstacion = asignarPedidoAEstacion;
window.liberarEstacionDePedido = liberarEstacionDePedido;
window.obtenerAsignacionesActuales = obtenerAsignacionesActuales;
window.ejecutarSincronizacionCompleta = ejecutarSincronizacionCompleta;

console.log('[SYNC] Funciones de sincronización entre paneles cargadas');

// ========================================
// FUNCIÓN DE LIMPIEZA TOTAL
// ========================================

/**
 * Limpia TODOS los datos del sistema para empezar de cero
 * ⚠️ CUIDADO: Esta acción es irreversible
 */
function limpiarTodosLosDatos() {
    if (!confirm('⚠️ ¿Estás seguro de eliminar TODOS los datos?\n\nEsto borrará:\n- Clientes\n- Pedidos\n- Productos\n- Empleados\n- Materiales\n- Asignaciones\n- Historial\n\nEsta acción NO se puede deshacer.')) {
        return false;
    }

    if (!confirm('⚠️ SEGUNDA CONFIRMACIÓN\n\n¿Realmente quieres borrar todo?')) {
        return false;
    }

    console.log('🧹 Iniciando limpieza total...');

    // 1. Crear base de datos vacía pero con estructura completa
    // Usamos la estructura de initialData pero con arrays vacíos
    const dbVacia = {
        config: {
            companyName: 'Multifundas',
            alertInterval: 60,
            excessThreshold: 5,
            qualityCheckRequired: true
        },
        areas: [
            { id: 1, nombre: 'Corte', color: '#ec4899' },
            { id: 2, nombre: 'Costura', color: '#667eea' },
            { id: 3, nombre: 'Serigrafía', color: '#f59e0b' },
            { id: 4, nombre: 'Empaque', color: '#8b5cf6' },
            { id: 5, nombre: 'Calidad', color: '#10b981' }
        ],
        areasPlanta: [
            { id: 'manual', nombre: 'Manual', posiciones: 1, color: '#94a3b8' },
            { id: 'extras', nombre: 'Extras', posiciones: 2, color: '#f59e0b' },
            { id: 'costura', nombre: 'Costura', posiciones: 24, color: '#3b82f6' },
            { id: 'empaque', nombre: 'Empaque y Calidad', posiciones: 6, color: '#ec4899' },
            { id: 'serigrafia', nombre: 'Serigrafía', posiciones: 2, color: '#f59e0b' },
            { id: 'cortebies', nombre: 'Corte de Bies', posiciones: 2, color: '#10b981' },
            { id: 'doblado', nombre: 'Doblado de Fundas', posiciones: 2, color: '#8b5cf6' },
            { id: 'corte', nombre: 'Área de Corte', posiciones: 2, color: '#06b6d4' },
            { id: 'cortemedida', nombre: 'Corte a Medida', posiciones: 3, color: '#14b8a6' }
        ],
        estaciones: [
            // Manual
            { id: 'M1', areaPlantaId: 'manual', nombre: 'Manual 1', operadorId: null },
            // Extras
            { id: 'EX1', areaPlantaId: 'extras', nombre: 'Extra 1', operadorId: null },
            { id: 'EX2', areaPlantaId: 'extras', nombre: 'Extra 2', operadorId: null },
            // Costura (24 posiciones)
            { id: 'C1', areaPlantaId: 'costura', nombre: 'Costura 1', operadorId: null },
            { id: 'C2', areaPlantaId: 'costura', nombre: 'Costura 2', operadorId: null },
            { id: 'C3', areaPlantaId: 'costura', nombre: 'Costura 3', operadorId: null },
            { id: 'C4', areaPlantaId: 'costura', nombre: 'Costura 4', operadorId: null },
            { id: 'C5', areaPlantaId: 'costura', nombre: 'Costura 5', operadorId: null },
            { id: 'C6', areaPlantaId: 'costura', nombre: 'Costura 6', operadorId: null },
            { id: 'C7', areaPlantaId: 'costura', nombre: 'Costura 7', operadorId: null },
            { id: 'C8', areaPlantaId: 'costura', nombre: 'Costura 8', operadorId: null },
            { id: 'C9', areaPlantaId: 'costura', nombre: 'Costura 9', operadorId: null },
            { id: 'C10', areaPlantaId: 'costura', nombre: 'Costura 10', operadorId: null },
            { id: 'C11', areaPlantaId: 'costura', nombre: 'Costura 11', operadorId: null },
            { id: 'C12', areaPlantaId: 'costura', nombre: 'Costura 12', operadorId: null },
            { id: 'C13', areaPlantaId: 'costura', nombre: 'Costura 13', operadorId: null },
            { id: 'C14', areaPlantaId: 'costura', nombre: 'Costura 14', operadorId: null },
            { id: 'C15', areaPlantaId: 'costura', nombre: 'Costura 15', operadorId: null },
            { id: 'C16', areaPlantaId: 'costura', nombre: 'Costura 16', operadorId: null },
            { id: 'C17', areaPlantaId: 'costura', nombre: 'Costura 17', operadorId: null },
            { id: 'C18', areaPlantaId: 'costura', nombre: 'Costura 18', operadorId: null },
            { id: 'C19', areaPlantaId: 'costura', nombre: 'Costura 19', operadorId: null },
            { id: 'C20', areaPlantaId: 'costura', nombre: 'Costura 20', operadorId: null },
            { id: 'C21', areaPlantaId: 'costura', nombre: 'Costura 21', operadorId: null },
            { id: 'C22', areaPlantaId: 'costura', nombre: 'Costura 22', operadorId: null },
            { id: 'C23', areaPlantaId: 'costura', nombre: 'Costura 23', operadorId: null },
            { id: 'C24', areaPlantaId: 'costura', nombre: 'Costura 24', operadorId: null },
            // Empaque y Calidad
            { id: 'E1', areaPlantaId: 'empaque', nombre: 'Empaque 1', operadorId: null },
            { id: 'E2', areaPlantaId: 'empaque', nombre: 'Empaque 2', operadorId: null },
            { id: 'E3', areaPlantaId: 'empaque', nombre: 'Empaque 3', operadorId: null },
            { id: 'E4', areaPlantaId: 'empaque', nombre: 'Empaque 4', operadorId: null },
            { id: 'E5', areaPlantaId: 'empaque', nombre: 'Empaque 5', operadorId: null },
            { id: 'E6', areaPlantaId: 'empaque', nombre: 'Empaque 6', operadorId: null },
            // Serigrafía
            { id: 'S1', areaPlantaId: 'serigrafia', nombre: 'Serigrafía 1', operadorId: null },
            { id: 'S2', areaPlantaId: 'serigrafia', nombre: 'Serigrafía 2', operadorId: null },
            // Corte de Bies
            { id: 'CB1', areaPlantaId: 'cortebies', nombre: 'Corte Bies 1', operadorId: null },
            { id: 'CB2', areaPlantaId: 'cortebies', nombre: 'Corte Bies 2', operadorId: null },
            // Doblado de Fundas
            { id: 'D1', areaPlantaId: 'doblado', nombre: 'Doblado 1', operadorId: null },
            { id: 'D2', areaPlantaId: 'doblado', nombre: 'Doblado 2', operadorId: null },
            // Área de Corte
            { id: 'AC1', areaPlantaId: 'corte', nombre: 'Corte 1', operadorId: null },
            { id: 'AC2', areaPlantaId: 'corte', nombre: 'Corte 2', operadorId: null },
            // Corte a Medida
            { id: 'CM1', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 1', operadorId: null },
            { id: 'CM2', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 2', operadorId: null },
            { id: 'CM3', areaPlantaId: 'cortemedida', nombre: 'Corte Medida 3', operadorId: null }
        ],
        clientes: [],
        productos: [],
        pedidos: [],
        personal: [],
        materiales: [],
        procesos: [],
        maquinas: [],
        estadoOperadores: [],
        familias: [],
        subfamilias: [],
        auditoria: []
    };

    // Guardar DB vacía
    localStorage.setItem('multifundas_db', JSON.stringify(dbVacia));

    // 2. Limpiar claves de sincronización entre paneles
    const clavesALimpiar = [
        // Sincronización
        'operadoras_db',
        'pedidos_activos',
        'pedidos_dia',
        'asignaciones_estaciones',
        'estado_maquinas',

        // Notificaciones y mensajes
        'notificaciones_coco',
        'notificaciones_supervisora',
        'supervisora_notificaciones',
        'mensajes_operadoras',

        // Historial y producción
        'historial_produccion',
        'historial_produccion_hora',
        'historial_procesos',
        'supervisora_historial_procesos',
        'historial_turnos',

        // Tiempos muertos
        'tiempos_muertos',

        // Estado de supervisora
        'supervisora_maquinas',
        'supervisora_liberaciones',
        'cola_procesos_operadores',

        // Configuración
        'config_sistema',
        'config_operadora_sync',

        // Eventos
        'calendario_eventos',
        'eventos_proceso',

        // Cola offline
        'cola_offline'
    ];

    clavesALimpiar.forEach(clave => {
        localStorage.removeItem(clave);
        console.log(`  ✓ Eliminado: ${clave}`);
    });

    // 3. Limpiar claves de temporizadores de estaciones
    const todasLasClaves = Object.keys(localStorage);
    todasLasClaves.forEach(clave => {
        if (clave.startsWith('temporizador_') ||
            clave.startsWith('backup_') ||
            clave.startsWith('operadora_')) {
            localStorage.removeItem(clave);
            console.log(`  ✓ Eliminado: ${clave}`);
        }
    });

    // 4. Recargar la base de datos en memoria
    if (typeof db !== 'undefined') {
        // Actualizar el objeto db.data con la DB vacía
        db.data = dbVacia;
        // Guardar usando el método de la clase
        if (typeof db.save === 'function') {
            db.save();
        }
    }

    console.log('✅ Limpieza completada');
    console.log('');
    console.log('📋 Siguiente paso: Crear datos frescos en el Panel Admin');

    alert('✅ Todos los datos han sido eliminados.\n\nRecarga la página (F5) para comenzar con datos frescos.');

    // Recargar la página automáticamente
    location.reload();

    return true;
}

/**
 * Limpieza parcial - Solo datos de producción (mantiene catálogos)
 */
function limpiarDatosProduccion() {
    if (!confirm('¿Eliminar datos de producción?\n\nEsto borrará:\n- Asignaciones\n- Historial de producción\n- Notificaciones\n- Tiempos muertos\n\nPero MANTENDRÁ:\n- Clientes\n- Productos\n- Empleados\n- Pedidos')) {
        return false;
    }

    const clavesProduccion = [
        'asignaciones_estaciones',
        'estado_maquinas',
        'historial_produccion',
        'historial_produccion_hora',
        'historial_procesos',
        'supervisora_historial_procesos',
        'notificaciones_coco',
        'mensajes_operadoras',
        'tiempos_muertos',
        'cola_offline',
        'supervisora_maquinas'
    ];

    clavesProduccion.forEach(clave => {
        localStorage.removeItem(clave);
        console.log(`  ✓ Eliminado: ${clave}`);
    });

    // Limpiar temporizadores
    Object.keys(localStorage).forEach(clave => {
        if (clave.startsWith('temporizador_')) {
            localStorage.removeItem(clave);
            console.log(`  ✓ Eliminado: ${clave}`);
        }
    });

    console.log('✅ Datos de producción eliminados');
    alert('✅ Datos de producción eliminados.\n\nLos catálogos se mantienen.');

    // Recargar la página
    location.reload();

    return true;
}

// Función para limpiar notificaciones obsoletas
function limpiarNotificacionesObsoletas() {
    // Limpiar notificaciones del objeto db
    if (typeof db !== 'undefined' && db.data) {
        db.data.notificaciones = [];
        db.save();
        console.log('✅ Notificaciones limpiadas');
    }
}

// Exponer funciones
window.limpiarTodosLosDatos = limpiarTodosLosDatos;
window.limpiarDatosProduccion = limpiarDatosProduccion;
window.limpiarNotificacionesObsoletas = limpiarNotificacionesObsoletas;

console.log('🧹 Funciones de limpieza disponibles:');
console.log('   - limpiarTodosLosDatos() : Borra TODO');
console.log('   - limpiarDatosProduccion() : Solo producción');

// Limpiar automáticamente notificaciones obsoletas al cargar
setTimeout(() => {
    if (typeof db !== 'undefined' && db.data && db.data.notificaciones) {
        // Limpiar notificaciones que referencian datos inexistentes
        const pedidosIds = (db.data.pedidos || []).map(p => p.id);
        const notificacionesValidas = db.data.notificaciones.filter(n => {
            // Si la notificación menciona un pedido, verificar que existe
            const match = n.mensaje?.match(/Pedido #(\d+)/);
            if (match) {
                const pedidoId = parseInt(match[1]);
                return pedidosIds.includes(pedidoId);
            }
            return true;
        });

        if (notificacionesValidas.length !== db.data.notificaciones.length) {
            console.log(`🧹 Limpiando ${db.data.notificaciones.length - notificacionesValidas.length} notificaciones obsoletas`);
            db.data.notificaciones = notificacionesValidas;
            db.save();
        }
    }
}, 500);
