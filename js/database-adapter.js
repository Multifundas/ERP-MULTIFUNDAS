// ========================================
// ERP MULTIFUNDAS - Database Adapter (Supabase)
// Implementa la MISMA interfaz que la clase Database de data.js
// ========================================

// DEBUG_MODE se define aquí porque este archivo carga antes de app.js
var DEBUG_MODE = window.DEBUG_MODE || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Referencia al helper CRUD exportado por supabase-client.js
var SupabaseClient = window.SupabaseClient;

class SupabaseDatabase {
    constructor() {
        this.data = null; // Cache en memoria
        this._ready = false;
        this._initPromise = this._init();
    }

    // ========================================
    // INICIALIZACIÓN — Precarga datos desde Supabase
    // ========================================
    async _init() {
        DEBUG_MODE && console.log('[SupabaseDB] Iniciando precarga de datos...');
        try {
            // Cargar todo en paralelo
            const [
                areas,
                areasPlanta,
                estaciones,
                procesos,
                familias,
                subfamilias,
                clientes,
                productos,
                personal,
                pedidos,
                pedidoProductos,
                estadoOperadores,
                materiales,
                bom,
                auditoria,
                notificaciones,
                configRows,
                inventarioPiezas
            ] = await Promise.all([
                SupabaseClient.getAll('areas'),
                SupabaseClient.getAll('areas_planta'),
                SupabaseClient.getAll('estaciones'),
                SupabaseClient.getAll('procesos'),
                SupabaseClient.getAll('familias'),
                SupabaseClient.getAll('subfamilias'),
                SupabaseClient.getAll('clientes'),
                SupabaseClient.getAll('productos'),
                SupabaseClient.getAll('personal'),
                SupabaseClient.getAll('pedidos'),
                SupabaseClient.getAll('pedido_productos'),
                SupabaseClient.getAll('estado_operadores'),
                SupabaseClient.getAll('materiales'),
                SupabaseClient.getAll('bom'),
                SupabaseClient.getAll('auditoria', { order: { column: 'fecha', ascending: false }, limit: 200 }),
                SupabaseClient.getAll('notificaciones', { order: { column: 'fecha', ascending: false } }),
                SupabaseClient.getAll('config_sistema'),
                SupabaseClient.getAll('inventario_piezas')
            ]);

            // Mapear pedido_productos a la estructura de pedidos.productos
            const pedidosConProductos = pedidos.map(p => ({
                ...this._mapPedidoFromDB(p),
                productos: pedidoProductos
                    .filter(pp => pp.pedido_id === p.id)
                    .map(pp => this._mapPedidoProductoFromDB(pp))
            }));

            // Construir config
            const config = { companyName: 'Multifundas', alertInterval: 60, excessThreshold: 5, inactivityAlert: 30 };
            const empresaRow = configRows.find(r => r.clave === 'empresa');
            if (empresaRow && empresaRow.valor) {
                Object.assign(config, empresaRow.valor);
            }

            this.data = {
                config,
                areas: areas.map(a => this._mapAreaFromDB(a)),
                areasPlanta: areasPlanta.map(a => this._mapAreaPlantaFromDB(a)),
                estaciones: estaciones.map(e => this._mapEstacionFromDB(e)),
                procesos: procesos.map(p => this._mapProcesoFromDB(p)),
                familias: familias.map(f => ({ id: f.id, nombre: f.nombre, color: f.color })),
                subfamilias: subfamilias.map(s => ({ id: s.id, familiaId: s.familia_id, nombre: s.nombre })),
                clientes: clientes.map(c => this._mapClienteFromDB(c)),
                productos: productos.map(p => this._mapProductoFromDB(p)),
                personal: personal.map(p => this._mapPersonalFromDB(p)),
                pedidos: pedidosConProductos,
                produccionActiva: [],
                estadoOperadores: estadoOperadores.map(e => this._mapEstadoOperadorFromDB(e)),
                materiales: materiales.map(m => this._mapMaterialFromDB(m)),
                bom: bom.map(b => ({ productoId: b.producto_id, materialId: b.material_id, cantidad: b.cantidad, unidad: b.unidad, notas: b.notas })),
                auditoria: auditoria.map(a => this._mapAuditoriaFromDB(a)),
                notificaciones: notificaciones.map(n => this._mapNotificacionFromDB(n)),
                inventarioPiezas: inventarioPiezas.map(p => this._mapInventarioPiezaFromDB(p))
            };

            this._ready = true;
            DEBUG_MODE && console.log('[SupabaseDB] Precarga completa:', {
                areas: this.data.areas.length,
                estaciones: this.data.estaciones.length,
                procesos: this.data.procesos.length,
                clientes: this.data.clientes.length,
                productos: this.data.productos.length,
                personal: this.data.personal.length,
                pedidos: this.data.pedidos.length
            });
        } catch (err) {
            console.error('[SupabaseDB] Error en precarga:', err);
            // Fallback: usar datos vacíos
            this.data = {
                config: { companyName: 'Multifundas', alertInterval: 60, excessThreshold: 5, inactivityAlert: 30 },
                areas: [], areasPlanta: [], estaciones: [], procesos: [],
                familias: [], subfamilias: [], clientes: [], productos: [],
                personal: [], pedidos: [], produccionActiva: [],
                estadoOperadores: [], materiales: [], bom: [],
                auditoria: [], notificaciones: [], inventarioPiezas: []
            };
            this._ready = true;
        }
    }

    // Promise que resuelve cuando la DB está lista
    get ready() {
        return this._initPromise;
    }

    // ========================================
    // MAPPERS: snake_case (DB) → camelCase (JS)
    // ========================================

    _mapAreaFromDB(a) {
        return { id: a.id, nombre: a.nombre, activa: a.activa, color: a.color };
    }

    _mapAreaPlantaFromDB(a) {
        return { id: a.id, nombre: a.nombre, posiciones: a.posiciones, color: a.color };
    }

    _mapEstacionFromDB(e) {
        return { id: e.id, areaPlantaId: e.area_planta_id, nombre: e.nombre, operadorId: e.operador_id };
    }

    _mapProcesoFromDB(p) {
        return { id: p.id, areaId: p.area_id, nombre: p.nombre, tiempoEstandar: parseFloat(p.tiempo_estandar), unidad: p.unidad };
    }

    _mapClienteFromDB(c) {
        return {
            id: c.id, nombreComercial: c.nombre_comercial, razonSocial: c.razon_social,
            rfc: c.rfc, tipo: c.tipo || 'externo', contacto: c.contacto,
            telefono: c.telefono, telefonoAlt: c.telefono_alt, email: c.email,
            direccion: c.direccion, ciudad: c.ciudad, estado: c.estado,
            codigoPostal: c.codigo_postal, notas: c.notas, activo: c.activo,
            usuario: c.usuario, accesoPortal: c.acceso_portal || false,
            fechaAlta: c.fecha_alta, articulosFrecuentes: []
        };
    }

    _mapProductoFromDB(p) {
        return {
            id: p.id, clienteId: p.cliente_id, nombre: p.nombre, descripcion: p.descripcion,
            familiaId: p.familia_id, subfamiliaId: p.subfamilia_id,
            precioVenta: parseFloat(p.precio_venta || 0), costoEstimado: parseFloat(p.costo_estimado || 0),
            version: p.version, activo: p.activo, imagen: p.imagen, notas: p.notas,
            medidas: p.medidas, mtsPorPieza: parseFloat(p.mts_por_pieza || 0),
            comentarios: p.comentarios, listaMateriales: p.lista_materiales || [],
            descripcionTecnica: p.descripcion_tecnica, costosMO: p.costos_mo || {},
            rutaProcesos: []
        };
    }

    _mapPersonalFromDB(p) {
        return {
            id: p.id, numEmpleado: p.num_empleado, nombre: p.nombre, rol: p.rol,
            areaId: p.area_id, // PIN ya no se expone (hash en DB, validación via RPC)
            horaEntrada: p.hora_entrada, horaSalida: p.hora_salida,
            foto: p.foto, activo: p.activo, bloqueado: p.bloqueado,
            permisos: p.permisos || {},
            salarioSemanal: parseFloat(p.salario_semanal || 0),
            salarioHora: parseFloat(p.salario_hora || 0),
            horasRealesDia: parseFloat(p.horas_reales_dia || 8),
            premioPuntualidad: parseFloat(p.premio_puntualidad || 0),
            premioProduccion: parseFloat(p.premio_produccion || 0),
            previsionSocial: parseFloat(p.prevision_social || 0),
            sinHoraComida: p.sin_hora_comida || false,
            horaComidaInicio: p.hora_comida_inicio || '13:00',
            horaComidaFin: p.hora_comida_fin || '14:00',
            posiciones: p.posiciones || [],
            ultimoAcceso: p.ultimo_acceso,
            intentosFallidos: p.intentos_fallidos || 0
        };
    }

    _mapPedidoFromDB(p) {
        return {
            id: p.id, codigo: p.codigo, clienteId: p.cliente_id,
            clienteNombre: p.cliente_nombre, estado: p.estado, prioridad: p.prioridad,
            fechaCarga: p.fecha_carga, fechaEntrega: p.fecha_entrega,
            fechaCompletado: p.fecha_completado, descripcion: p.descripcion,
            notas: p.notas, presupuestoEstimado: parseFloat(p.presupuesto_estimado || 0),
            costoReal: parseFloat(p.costo_real || 0), imagen: p.imagen,
            imagenesApoyo: p.imagenes_apoyo || [],
            productos: []
        };
    }

    _mapPedidoProductoFromDB(pp) {
        return {
            id: pp.id, productoId: pp.producto_id, productoNombre: pp.producto_nombre,
            cantidad: pp.cantidad, completadas: pp.completadas,
            precioUnitario: parseFloat(pp.precio_unitario || 0),
            notas: pp.notas, avanceProcesos: pp.avance_procesos || []
        };
    }

    _mapEstadoOperadorFromDB(e) {
        return {
            operadorId: e.operador_id, estacionId: e.estacion_id,
            estado: e.estado, efectividad: parseFloat(e.efectividad || 0),
            iniciales: e.iniciales, piezasRealizadas: e.piezas_realizadas,
            metaActual: e.meta_actual, procesoActual: e.proceso_actual,
            pedidoId: e.pedido_id
        };
    }

    _mapMaterialFromDB(m) {
        return {
            id: m.id, nombre: m.nombre, descripcion: m.descripcion,
            unidad: m.unidad, costo: parseFloat(m.costo || 0),
            stockActual: parseFloat(m.stock_actual || 0),
            stockMinimo: parseFloat(m.stock_minimo || 0), proveedor: m.proveedor
        };
    }

    _mapAuditoriaFromDB(a) {
        return {
            id: a.id, fecha: a.fecha, usuario: a.usuario,
            accion: a.accion, detalle: a.detalle,
            entidad: a.entidad, entidadId: a.entidad_id
        };
    }

    _mapNotificacionFromDB(n) {
        return {
            id: n.id, tipo: n.tipo, titulo: n.titulo,
            mensaje: n.mensaje, leida: n.leida, fecha: n.fecha
        };
    }

    _mapInventarioPiezaFromDB(p) {
        return {
            id: p.id, productoId: p.producto_id, procesoNombre: p.proceso_nombre,
            descripcion: p.descripcion, cantidadDisponible: p.cantidad_disponible,
            cantidadMinima: p.cantidad_minima, unidad: p.unidad,
            esPreproducible: p.es_preproducible, ultimaActualizacion: p.ultima_actualizacion,
            historialMovimientos: []
        };
    }

    // ========================================
    // MAPPERS: camelCase (JS) → snake_case (DB)
    // ========================================

    _mapClienteToDB(c) {
        const mapped = {};
        if (c.nombreComercial !== undefined) mapped.nombre_comercial = c.nombreComercial;
        if (c.razonSocial !== undefined) mapped.razon_social = c.razonSocial;
        if (c.rfc !== undefined) mapped.rfc = c.rfc;
        if (c.tipo !== undefined) mapped.tipo = c.tipo;
        if (c.contacto !== undefined) mapped.contacto = c.contacto;
        if (c.telefono !== undefined) mapped.telefono = c.telefono;
        if (c.telefonoAlt !== undefined) mapped.telefono_alt = c.telefonoAlt;
        if (c.email !== undefined) mapped.email = c.email;
        if (c.direccion !== undefined) mapped.direccion = c.direccion;
        if (c.ciudad !== undefined) mapped.ciudad = c.ciudad;
        if (c.estado !== undefined) mapped.estado = c.estado;
        if (c.codigoPostal !== undefined) mapped.codigo_postal = c.codigoPostal;
        if (c.usuario !== undefined) mapped.usuario = c.usuario;
        if (c.accesoPortal !== undefined) mapped.acceso_portal = c.accesoPortal;
        if (c.notas !== undefined) mapped.notas = c.notas;
        if (c.activo !== undefined) mapped.activo = c.activo;
        return mapped;
    }

    _mapProductoToDB(p) {
        const mapped = {};
        if (p.clienteId !== undefined) mapped.cliente_id = p.clienteId;
        if (p.nombre !== undefined) mapped.nombre = p.nombre;
        if (p.descripcion !== undefined) mapped.descripcion = p.descripcion;
        if (p.familiaId !== undefined) mapped.familia_id = p.familiaId;
        if (p.subfamiliaId !== undefined) mapped.subfamilia_id = p.subfamiliaId;
        if (p.precioVenta !== undefined) mapped.precio_venta = p.precioVenta;
        if (p.costoEstimado !== undefined) mapped.costo_estimado = p.costoEstimado;
        if (p.version !== undefined) mapped.version = p.version;
        if (p.activo !== undefined) mapped.activo = p.activo;
        if (p.imagen !== undefined) mapped.imagen = p.imagen;
        if (p.notas !== undefined) mapped.notas = p.notas;
        if (p.medidas !== undefined) mapped.medidas = p.medidas;
        if (p.mtsPorPieza !== undefined) mapped.mts_por_pieza = p.mtsPorPieza;
        if (p.comentarios !== undefined) mapped.comentarios = p.comentarios;
        if (p.listaMateriales !== undefined) mapped.lista_materiales = p.listaMateriales;
        if (p.descripcionTecnica !== undefined) mapped.descripcion_tecnica = p.descripcionTecnica;
        if (p.costosMO !== undefined) mapped.costos_mo = p.costosMO;
        return mapped;
    }

    _mapPersonalToDB(p) {
        const mapped = {};
        if (p.numEmpleado !== undefined) mapped.num_empleado = p.numEmpleado;
        if (p.nombre !== undefined) mapped.nombre = p.nombre;
        if (p.rol !== undefined) mapped.rol = p.rol;
        if (p.areaId !== undefined) mapped.area_id = p.areaId;
        // PIN se maneja via RPC set_pin(), no se escribe directo a pin_hash
        if (p.horaEntrada !== undefined) mapped.hora_entrada = p.horaEntrada;
        if (p.horaSalida !== undefined) mapped.hora_salida = p.horaSalida;
        if (p.foto !== undefined) mapped.foto = p.foto;
        if (p.activo !== undefined) mapped.activo = p.activo;
        if (p.bloqueado !== undefined) mapped.bloqueado = p.bloqueado;
        if (p.permisos !== undefined) mapped.permisos = p.permisos;
        if (p.salarioSemanal !== undefined) mapped.salario_semanal = p.salarioSemanal;
        if (p.salarioHora !== undefined) mapped.salario_hora = p.salarioHora;
        if (p.horasRealesDia !== undefined) mapped.horas_reales_dia = p.horasRealesDia;
        if (p.premioPuntualidad !== undefined) mapped.premio_puntualidad = p.premioPuntualidad;
        if (p.premioProduccion !== undefined) mapped.premio_produccion = p.premioProduccion;
        if (p.previsionSocial !== undefined) mapped.prevision_social = p.previsionSocial;
        if (p.sinHoraComida !== undefined) mapped.sin_hora_comida = p.sinHoraComida;
        if (p.horaComidaInicio !== undefined) mapped.hora_comida_inicio = p.horaComidaInicio;
        if (p.horaComidaFin !== undefined) mapped.hora_comida_fin = p.horaComidaFin;
        if (p.posiciones !== undefined) mapped.posiciones = p.posiciones;
        if (p.ultimoAcceso !== undefined) mapped.ultimo_acceso = p.ultimoAcceso;
        if (p.intentosFallidos !== undefined) mapped.intentos_fallidos = p.intentosFallidos;
        return mapped;
    }

    _mapPedidoToDB(p) {
        const mapped = {};
        if (p.codigo !== undefined) mapped.codigo = p.codigo;
        if (p.clienteId !== undefined) mapped.cliente_id = p.clienteId;
        if (p.clienteNombre !== undefined) mapped.cliente_nombre = p.clienteNombre;
        if (p.estado !== undefined) mapped.estado = p.estado;
        if (p.prioridad !== undefined) mapped.prioridad = p.prioridad;
        if (p.fechaEntrega !== undefined) mapped.fecha_entrega = p.fechaEntrega;
        if (p.fechaCompletado !== undefined) mapped.fecha_completado = p.fechaCompletado;
        if (p.descripcion !== undefined) mapped.descripcion = p.descripcion;
        if (p.notas !== undefined) mapped.notas = p.notas;
        if (p.presupuestoEstimado !== undefined) mapped.presupuesto_estimado = p.presupuestoEstimado;
        if (p.costoReal !== undefined) mapped.costo_real = p.costoReal;
        if (p.imagen !== undefined) mapped.imagen = p.imagen;
        if (p.imagenesApoyo !== undefined) mapped.imagenes_apoyo = p.imagenesApoyo;
        return mapped;
    }

    _mapMaterialToDB(m) {
        const mapped = {};
        if (m.nombre !== undefined) mapped.nombre = m.nombre;
        if (m.descripcion !== undefined) mapped.descripcion = m.descripcion;
        if (m.unidad !== undefined) mapped.unidad = m.unidad;
        if (m.costo !== undefined) mapped.costo = m.costo;
        if (m.stockActual !== undefined) mapped.stock_actual = m.stockActual;
        if (m.stockMinimo !== undefined) mapped.stock_minimo = m.stockMinimo;
        if (m.proveedor !== undefined) mapped.proveedor = m.proveedor;
        return mapped;
    }

    // ========================================
    // Método save() — No-op para Supabase (write-through)
    // Mantiene compatibilidad con código que llama db.save()
    // ========================================
    save() {
        // En Supabase, cada operación escribe directamente
        // Este método existe solo para compatibilidad
    }

    load() {
        return this.data;
    }

    reset() {
        console.warn('[SupabaseDB] reset() no implementado para Supabase');
    }

    // ========================================
    // CLIENTES
    // ========================================
    getClientes() {
        return this.data.clientes;
    }

    getCliente(id) {
        return this.data.clientes.find(c => c.id === id);
    }

    addCliente(cliente) {
        const dbCliente = this._mapClienteToDB(cliente);
        dbCliente.fecha_alta = new Date().toISOString().split('T')[0];

        // Write-through: actualizar cache inmediatamente con ID temporal
        const tempId = Math.max(...this.data.clientes.map(c => c.id), 0) + 1;
        const cached = { ...cliente, id: tempId, fechaAlta: dbCliente.fecha_alta };
        if (!cached.articulosFrecuentes) cached.articulosFrecuentes = [];
        this.data.clientes.push(cached);

        // Async write a Supabase
        SupabaseClient.insert('clientes', dbCliente).then(result => {
            if (result) {
                // Actualizar ID real
                const idx = this.data.clientes.findIndex(c => c.id === tempId);
                if (idx !== -1) {
                    this.data.clientes[idx] = this._mapClienteFromDB(result);
                }
            }
        });

        this.addAuditoria('Nuevo cliente', `Cliente "${cliente.nombreComercial}" creado`, 'cliente', tempId);
        return cached;
    }

    updateCliente(id, updates) {
        const index = this.data.clientes.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.clientes[index] = { ...this.data.clientes[index], ...updates };
            SupabaseClient.update('clientes', id, this._mapClienteToDB(updates));
            this.addAuditoria('Cliente actualizado', `Cliente ID ${id} modificado`, 'cliente', id);
            return this.data.clientes[index];
        }
        return null;
    }

    deleteCliente(id) {
        const cliente = this.getCliente(id);
        this.data.clientes = this.data.clientes.filter(c => c.id !== id);
        SupabaseClient.remove('clientes', id);
        if (cliente) {
            this.addAuditoria('Cliente eliminado', `Cliente "${cliente.nombreComercial}" eliminado`, 'cliente', id);
        }
    }

    // ========================================
    // PRODUCTOS
    // ========================================
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
        const dbProducto = this._mapProductoToDB(producto);
        dbProducto.version = 1;
        dbProducto.activo = true;

        const tempId = Math.max(...this.data.productos.map(p => p.id), 0) + 1;
        const cached = { ...producto, id: tempId, version: 1, activo: true, rutaProcesos: producto.rutaProcesos || [] };
        this.data.productos.push(cached);

        SupabaseClient.insert('productos', dbProducto).then(result => {
            if (result) {
                const idx = this.data.productos.findIndex(p => p.id === tempId);
                if (idx !== -1) {
                    this.data.productos[idx] = { ...this._mapProductoFromDB(result), rutaProcesos: cached.rutaProcesos };
                }
            }
        });

        this.addAuditoria('Nuevo producto', `Producto "${producto.nombre}" creado`, 'producto', tempId);
        return cached;
    }

    updateProducto(id, updates) {
        const index = this.data.productos.findIndex(p => p.id === id);
        if (index !== -1) {
            if (updates.procesos || updates.tiempoTotal) {
                updates.version = (this.data.productos[index].version || 1) + 1;
            }
            this.data.productos[index] = { ...this.data.productos[index], ...updates };
            SupabaseClient.update('productos', id, this._mapProductoToDB(updates));
            this.addAuditoria('Producto actualizado', `Producto ID ${id} modificado (v${updates.version || this.data.productos[index].version})`, 'producto', id);
            return this.data.productos[index];
        }
        return null;
    }

    // ========================================
    // PEDIDOS
    // ========================================
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
        const dbPedido = this._mapPedidoToDB(pedido);
        dbPedido.estado = 'pendiente';
        dbPedido.fecha_carga = new Date().toISOString().split('T')[0];

        const tempId = Math.max(...this.data.pedidos.map(p => p.id), 0) + 1;
        const cached = { ...pedido, id: tempId, estado: 'pendiente', fechaCarga: dbPedido.fecha_carga, productos: pedido.productos || [] };
        this.data.pedidos.push(cached);

        SupabaseClient.insert('pedidos', dbPedido).then(async result => {
            if (result) {
                const idx = this.data.pedidos.findIndex(p => p.id === tempId);
                if (idx !== -1) {
                    this.data.pedidos[idx] = { ...this._mapPedidoFromDB(result), productos: cached.productos };
                    // Insertar productos del pedido
                    if (cached.productos && cached.productos.length > 0) {
                        const dbProds = cached.productos.map(pp => ({
                            pedido_id: result.id,
                            producto_id: pp.productoId,
                            producto_nombre: pp.productoNombre || pp.nombre,
                            cantidad: pp.cantidad,
                            completadas: pp.completadas || 0,
                            precio_unitario: pp.precioUnitario || 0,
                            notas: pp.notas,
                            avance_procesos: pp.avanceProcesos || []
                        }));
                        await SupabaseClient.insertMany('pedido_productos', dbProds);
                    }
                }
            }
        });

        this.addAuditoria('Nuevo pedido', `Pedido #${tempId} creado para cliente ${pedido.clienteId}`, 'pedido', tempId);
        return cached;
    }

    updatePedido(id, updates) {
        const index = this.data.pedidos.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.pedidos[index] = { ...this.data.pedidos[index], ...updates };
            SupabaseClient.update('pedidos', id, this._mapPedidoToDB(updates));
            this.addAuditoria('Pedido actualizado', `Pedido #${id} modificado`, 'pedido', id);
            return this.data.pedidos[index];
        }
        return null;
    }

    deletePedido(id) {
        const pedido = this.getPedido(id);
        this.data.pedidos = this.data.pedidos.filter(p => p.id !== id);
        SupabaseClient.remove('pedidos', id); // CASCADE borra pedido_productos
        if (pedido) {
            this.addAuditoria('Pedido eliminado', `Pedido #${id} eliminado`, 'pedido', id);
        }
    }

    // ========================================
    // ÁREAS Y PROCESOS
    // ========================================
    getAreas() { return this.data.areas; }
    getArea(id) { return this.data.areas.find(a => a.id === id); }
    getProcesos() { return this.data.procesos; }
    getProcesosByArea(areaId) { return this.data.procesos.filter(p => p.areaId === areaId); }
    getProceso(id) { return this.data.procesos.find(p => p.id === id); }

    addProceso(proceso) {
        const tempId = Math.max(...this.data.procesos.map(p => p.id), 0) + 1;
        const cached = { ...proceso, id: tempId };
        this.data.procesos.push(cached);

        SupabaseClient.insert('procesos', {
            area_id: proceso.areaId, nombre: proceso.nombre,
            tiempo_estandar: proceso.tiempoEstandar, unidad: proceso.unidad || 'min/pza'
        }).then(result => {
            if (result) {
                const idx = this.data.procesos.findIndex(p => p.id === tempId);
                if (idx !== -1) this.data.procesos[idx] = this._mapProcesoFromDB(result);
            }
        });

        this.addAuditoria('Nuevo proceso', `Proceso "${proceso.nombre}" creado en área ${proceso.areaId}`, 'proceso', tempId);
        return cached;
    }

    updateProceso(id, updates) {
        const index = this.data.procesos.findIndex(p => p.id === id);
        if (index !== -1) {
            const oldTiempo = this.data.procesos[index].tiempoEstandar;
            this.data.procesos[index] = { ...this.data.procesos[index], ...updates };

            const dbUpdates = {};
            if (updates.nombre) dbUpdates.nombre = updates.nombre;
            if (updates.areaId) dbUpdates.area_id = updates.areaId;
            if (updates.tiempoEstandar !== undefined) dbUpdates.tiempo_estandar = updates.tiempoEstandar;
            if (updates.unidad) dbUpdates.unidad = updates.unidad;
            SupabaseClient.update('procesos', id, dbUpdates);

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

        const enUso = this.data.productos.some(prod =>
            prod.rutaProcesos && prod.rutaProcesos.some(rp => rp.procesoId === id)
        );
        if (enUso) return false;

        this.data.procesos = this.data.procesos.filter(p => p.id !== id);
        SupabaseClient.remove('procesos', id);
        this.addAuditoria('Proceso eliminado', `Proceso "${proceso.nombre}" eliminado`, 'proceso', id);
        return true;
    }

    // ========================================
    // PERSONAL
    // ========================================
    getPersonal() { return this.data.personal; }
    getPersonalByArea(areaId) { return this.data.personal.filter(p => p.areaId === areaId && p.activo); }
    getPersonalByRol(rol) { return this.data.personal.filter(p => p.rol === rol && p.activo); }
    getEmpleado(id) { return this.data.personal.find(p => p.id === id); }

    addEmpleado(empleado) {
        const tempId = Math.max(...this.data.personal.map(p => p.id), 0) + 1;
        const cached = { ...empleado, id: tempId, activo: true };
        this.data.personal.push(cached);

        SupabaseClient.insert('personal', { ...this._mapPersonalToDB(empleado), activo: true }).then(result => {
            if (result) {
                const idx = this.data.personal.findIndex(p => p.id === tempId);
                if (idx !== -1) this.data.personal[idx] = this._mapPersonalFromDB(result);

                // Hash PIN via server-side RPC
                if (empleado.pin) {
                    SupabaseClient.rpc('set_pin', { p_empleado_id: result.id, p_new_pin: empleado.pin });
                }
            }
        });

        this.addAuditoria('Nuevo empleado', `Empleado "${empleado.nombre}" agregado`, 'personal', tempId);
        return cached;
    }

    updateEmpleado(id, updates) {
        const index = this.data.personal.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.personal[index] = { ...this.data.personal[index], ...updates };
            SupabaseClient.update('personal', id, this._mapPersonalToDB(updates));

            // Si se cambió el PIN, hashear via RPC server-side
            if (updates.pin) {
                SupabaseClient.rpc('set_pin', { p_empleado_id: id, p_new_pin: updates.pin });
            }

            return this.data.personal[index];
        }
        return null;
    }

    // ========================================
    // MATERIALES
    // ========================================
    getMateriales() { return this.data.materiales; }
    getMaterial(id) { return this.data.materiales.find(m => m.id === id); }

    addMaterial(material) {
        const tempId = Math.max(...this.data.materiales.map(m => m.id), 0) + 1;
        const cached = { ...material, id: tempId };
        this.data.materiales.push(cached);

        SupabaseClient.insert('materiales', this._mapMaterialToDB(material)).then(result => {
            if (result) {
                const idx = this.data.materiales.findIndex(m => m.id === tempId);
                if (idx !== -1) this.data.materiales[idx] = this._mapMaterialFromDB(result);
            }
        });

        this.addAuditoria('Nuevo material', `Material "${material.nombre}" agregado`, 'material', tempId);
        return cached;
    }

    updateMaterial(id, updates) {
        const index = this.data.materiales.findIndex(m => m.id === id);
        if (index !== -1) {
            const oldCosto = this.data.materiales[index].costo;
            this.data.materiales[index] = { ...this.data.materiales[index], ...updates };
            SupabaseClient.update('materiales', id, this._mapMaterialToDB(updates));
            if (updates.costo && updates.costo !== oldCosto) {
                this.addAuditoria('Cambio de costo material', `Material ID ${id}: $${oldCosto} → $${updates.costo}`, 'material', id);
            }
            return this.data.materiales[index];
        }
        return null;
    }

    // ========================================
    // BOM
    // ========================================
    getBOM(productoId) {
        return this.data.bom.filter(b => b.productoId === productoId);
    }

    // ========================================
    // PRODUCCIÓN
    // ========================================
    getProduccionActiva() {
        return this.data.produccionActiva;
    }

    // ========================================
    // AUDITORÍA
    // ========================================
    getAuditoria() {
        return this.data.auditoria.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    addAuditoria(accion, detalle, entidad, entidadId) {
        const entry = {
            id: Math.max(...this.data.auditoria.map(a => a.id), 0) + 1,
            fecha: new Date().toISOString(),
            usuario: 'Admin',
            accion, detalle, entidad, entidadId: String(entidadId)
        };
        this.data.auditoria.unshift(entry);

        SupabaseClient.insert('auditoria', {
            usuario: 'Admin', accion, detalle, entidad, entidad_id: String(entidadId)
        });
    }

    // ========================================
    // NOTIFICACIONES
    // ========================================
    getNotificaciones() {
        return (this.data.notificaciones || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    getNotificacionesNoLeidas() {
        return (this.data.notificaciones || []).filter(n => !n.leida);
    }

    marcarNotificacionLeida(id) {
        const index = (this.data.notificaciones || []).findIndex(n => n.id === id);
        if (index !== -1) {
            this.data.notificaciones[index].leida = true;
            SupabaseClient.update('notificaciones', id, { leida: true });
        }
    }

    marcarTodasLeidas() {
        (this.data.notificaciones || []).forEach(n => {
            if (!n.leida) {
                n.leida = true;
                SupabaseClient.update('notificaciones', n.id, { leida: true });
            }
        });
    }

    addNotificacion(tipo, titulo, mensaje) {
        const entry = {
            id: Math.max(...(this.data.notificaciones || []).map(n => n.id), 0) + 1,
            tipo, titulo, mensaje, fecha: new Date().toISOString(), leida: false
        };
        this.data.notificaciones.unshift(entry);
        SupabaseClient.insert('notificaciones', { tipo, titulo, mensaje });
    }

    clearNotificaciones() {
        this.data.notificaciones = [];
        SupabaseClient.deleteAll('notificaciones');
    }

    removeNotificacion(id) {
        this.data.notificaciones = (this.data.notificaciones || []).filter(n => n.id !== id);
        SupabaseClient.remove('notificaciones', id);
    }

    setNotificaciones(notificaciones) {
        // Replace in-memory list and remove obsolete ones from Supabase
        const removedIds = (this.data.notificaciones || [])
            .filter(n => !notificaciones.find(v => v.id === n.id))
            .map(n => n.id);
        this.data.notificaciones = notificaciones;
        removedIds.forEach(id => SupabaseClient.remove('notificaciones', id));
    }

    // ========================================
    // ESTACIONES DE TRABAJO
    // ========================================
    getEstaciones() { return this.data.estaciones || []; }
    getEstacionesByArea(areaPlantaId) { return (this.data.estaciones || []).filter(e => e.areaPlantaId === areaPlantaId); }
    getEstacion(id) { return (this.data.estaciones || []).find(e => e.id === id); }

    asignarOperadorAEstacion(estacionId, operadorId) {
        const index = (this.data.estaciones || []).findIndex(e => e.id === estacionId);
        if (index !== -1) {
            this.data.estaciones[index].operadorId = operadorId;
            SupabaseClient.update('estaciones', estacionId, { operador_id: operadorId });
            this.addAuditoria('Asignación de estación', `Operador ${operadorId} asignado a estación ${estacionId}`, 'estacion', estacionId);
            return this.data.estaciones[index];
        }
        return null;
    }

    // ========================================
    // ÁREAS DE PLANTA
    // ========================================
    getAreasPlanta() { return this.data.areasPlanta || []; }
    getAreaPlanta(areaId) { return (this.data.areasPlanta || []).find(a => a.id === areaId); }

    addAreaPlanta(area) {
        if (!this.data.areasPlanta) this.data.areasPlanta = [];
        this.data.areasPlanta.push(area);
        SupabaseClient.insert('areas_planta', { id: area.id, nombre: area.nombre, posiciones: area.posiciones, color: area.color });
        this.addAuditoria('Nueva área de planta', `Área "${area.nombre}" creada con ${area.posiciones} posiciones`, 'areaPlanta', area.id);
        return area;
    }

    updateAreaPlanta(areaId, updates) {
        const index = (this.data.areasPlanta || []).findIndex(a => a.id === areaId);
        if (index !== -1) {
            this.data.areasPlanta[index] = { ...this.data.areasPlanta[index], ...updates };
            const dbUpdates = {};
            if (updates.nombre) dbUpdates.nombre = updates.nombre;
            if (updates.posiciones) dbUpdates.posiciones = updates.posiciones;
            if (updates.color) dbUpdates.color = updates.color;
            SupabaseClient.update('areas_planta', areaId, dbUpdates);
            this.addAuditoria('Área de planta actualizada', `Área ${areaId} modificada`, 'areaPlanta', areaId);
            return this.data.areasPlanta[index];
        }
        return null;
    }

    deleteAreaPlanta(areaId) {
        const area = (this.data.areasPlanta || []).find(a => a.id === areaId);
        this.data.areasPlanta = (this.data.areasPlanta || []).filter(a => a.id !== areaId);
        this.data.estaciones = (this.data.estaciones || []).filter(e => e.areaPlantaId !== areaId);
        SupabaseClient.remove('areas_planta', areaId); // CASCADE borra estaciones
        if (area) {
            this.addAuditoria('Área de planta eliminada', `Área "${area.nombre}" eliminada`, 'areaPlanta', areaId);
        }
    }

    addEstacion(estacion) {
        if (!this.data.estaciones) this.data.estaciones = [];
        this.data.estaciones.push(estacion);
        SupabaseClient.insert('estaciones', { id: estacion.id, area_planta_id: estacion.areaPlantaId, nombre: estacion.nombre });
        this.addAuditoria('Nueva estación', `Estación "${estacion.nombre}" creada en área ${estacion.areaPlantaId}`, 'estacion', estacion.id);
        return estacion;
    }

    updateEstacion(estacionId, updates) {
        const index = (this.data.estaciones || []).findIndex(e => e.id === estacionId);
        if (index !== -1) {
            this.data.estaciones[index] = { ...this.data.estaciones[index], ...updates };
            const dbUpdates = {};
            if (updates.nombre) dbUpdates.nombre = updates.nombre;
            if (updates.areaPlantaId) dbUpdates.area_planta_id = updates.areaPlantaId;
            if (updates.operadorId !== undefined) dbUpdates.operador_id = updates.operadorId;
            SupabaseClient.update('estaciones', estacionId, dbUpdates);
            return this.data.estaciones[index];
        }
        return null;
    }

    deleteEstacion(estacionId) {
        const estacion = (this.data.estaciones || []).find(e => e.id === estacionId);
        if (!estacion) return false;
        if (estacion.operadorId) return false;

        this.data.estaciones = this.data.estaciones.filter(e => e.id !== estacionId);
        if (this.data.estadoOperadores) {
            this.data.estadoOperadores = this.data.estadoOperadores.filter(e => e.estacionId !== estacionId);
        }
        SupabaseClient.remove('estaciones', estacionId);
        this.addAuditoria('Estación eliminada', `Estación ${estacionId} eliminada`, 'estacion', estacionId);
        return true;
    }

    // ========================================
    // HISTORIAL DE PRODUCCIÓN
    // ========================================
    getHistorialProduccion() {
        // Lee de Supabase en vez de localStorage
        // Para lecturas frecuentes, se podría cachear
        return SupabaseClient.getAll('historial_produccion', { order: { column: 'fecha', ascending: false } });
    }

    // ========================================
    // ESTADO DE OPERADORES
    // ========================================
    getEstadoOperadores() { return this.data.estadoOperadores || []; }
    getEstadoOperador(operadorId) { return (this.data.estadoOperadores || []).find(e => e.operadorId === operadorId); }

    addEstadoOperador(estado) {
        if (!this.data.estadoOperadores) this.data.estadoOperadores = [];
        const existeIndex = this.data.estadoOperadores.findIndex(e => e.estacionId === estado.estacionId);
        if (existeIndex !== -1) {
            this.data.estadoOperadores[existeIndex] = { ...this.data.estadoOperadores[existeIndex], ...estado };
            SupabaseClient.update('estado_operadores', estado.operadorId, {
                estacion_id: estado.estacionId,
                estado: estado.estado || 'inactivo',
                iniciales: estado.iniciales || '',
                ultimo_cambio: new Date().toISOString()
            }, 'operador_id');
        } else {
            this.data.estadoOperadores.push(estado);
            SupabaseClient.insert('estado_operadores', {
                operador_id: estado.operadorId,
                estacion_id: estado.estacionId,
                estado: estado.estado || 'inactivo',
                iniciales: estado.iniciales || '',
                ultimo_cambio: new Date().toISOString()
            });
        }
        return estado;
    }

    deleteEstadoOperador(estacionId) {
        if (!this.data.estadoOperadores) return;
        const estado = this.data.estadoOperadores.find(e => e.estacionId === estacionId);
        this.data.estadoOperadores = this.data.estadoOperadores.filter(e => e.estacionId !== estacionId);
        if (estado && estado.operadorId) {
            SupabaseClient.remove('estado_operadores', estado.operadorId, 'operador_id');
        }
    }

    updateEstadoOperador(operadorId, updates) {
        const index = (this.data.estadoOperadores || []).findIndex(e => e.operadorId === operadorId);
        if (index !== -1) {
            this.data.estadoOperadores[index] = { ...this.data.estadoOperadores[index], ...updates };

            const dbUpdates = {};
            if (updates.estado) dbUpdates.estado = updates.estado;
            if (updates.efectividad !== undefined) dbUpdates.efectividad = updates.efectividad;
            if (updates.iniciales) dbUpdates.iniciales = updates.iniciales;
            if (updates.piezasRealizadas !== undefined) dbUpdates.piezas_realizadas = updates.piezasRealizadas;
            if (updates.metaActual !== undefined) dbUpdates.meta_actual = updates.metaActual;
            if (updates.procesoActual) dbUpdates.proceso_actual = updates.procesoActual;
            if (updates.pedidoId !== undefined) dbUpdates.pedido_id = updates.pedidoId;
            dbUpdates.ultimo_cambio = new Date().toISOString();

            SupabaseClient.update('estado_operadores', operadorId, dbUpdates, 'operador_id');
            return this.data.estadoOperadores[index];
        }
        return null;
    }

    // ========================================
    // ESTADÍSTICAS
    // ========================================
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
            operadoresActivos,
            wipTotal: pedidosActivos.reduce((sum, p) => {
                return sum + (p.productos || []).reduce((s, pr) => s + (pr.cantidad - pr.completadas), 0);
            }, 0)
        };
    }

    getDashboardStats(periodo = 'month') {
        const pedidos = this.data.pedidos || [];
        const estadosInactivos = ['entregado', 'cancelado', 'anulado', 'completado'];
        const pedidosActivos = pedidos.filter(p => !estadosInactivos.includes((p.estado || 'pendiente').toLowerCase().trim()));
        const estadoOps = this.data.estadoOperadores || [];
        const estaciones = this.data.estaciones || [];

        const clientesActivos = [...new Set(pedidosActivos.map(p => p.clienteId))].length;
        const operadoresActivos = estadoOps.filter(e => e.estado !== 'inactivo').length;
        const procesosActivos = (this.data.produccionActiva || []).length;

        let ventaTotal = 0;
        const catalogoProductos = this.data.productos || [];
        pedidosActivos.forEach(pedido => {
            (pedido.productos || []).forEach(prod => {
                let precio = prod.precioUnitario || 0;
                if (precio === 0 && prod.productoId) {
                    const prodCatalogo = catalogoProductos.find(p => p.id === prod.productoId);
                    precio = prodCatalogo?.precioVenta || 0;
                }
                ventaTotal += (prod.cantidad || 0) * precio;
            });
        });

        const efectividades = estadoOps.filter(e => e.efectividad > 0).map(e => e.efectividad);
        const efectividadPromedio = efectividades.length > 0
            ? efectividades.reduce((a, b) => a + b, 0) / efectividades.length : 0;

        let totalPresupuesto = 0, totalCostoReal = 0;
        pedidosActivos.forEach(p => { totalPresupuesto += p.presupuestoEstimado || 0; totalCostoReal += p.costoReal || 0; });
        const vsPresupuesto = totalPresupuesto > 0 ? ((totalCostoReal - totalPresupuesto) / totalPresupuesto) * 100 : 0;

        const resumenEstados = {
            adelantados: estadoOps.filter(e => e.estado === 'adelantado').length,
            onPace: estadoOps.filter(e => e.estado === 'on-pace').length,
            retrasados: estadoOps.filter(e => e.estado === 'retrasado' || e.estado === 'muy-retrasado').length,
            sinAsignar: estaciones.filter(e => e.operadorId === null).length
        };

        return { procesosActivos, clientesActivos, operadoresActivos, ventaTotal,
            efectividadPromedio: Math.round(efectividadPromedio * 10) / 10,
            vsPresupuesto: Math.round(vsPresupuesto * 10) / 10, resumenEstados };
    }

    getMapaPlantaData() {
        const areasPlanta = this.data.areasPlanta || [];
        const estaciones = this.data.estaciones || [];
        const estadoOps = this.data.estadoOperadores || [];
        const personal = this.data.personal || [];

        const getIniciales = (nombre) => {
            if (!nombre) return '??';
            const partes = nombre.split(' ');
            return partes.length >= 2 ? (partes[0][0] + partes[1][0]).toUpperCase() : nombre.substring(0, 2).toUpperCase();
        };

        return areasPlanta.map(area => {
            const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
            const posiciones = estacionesArea.map(estacion => {
                const estadoOp = estadoOps.find(e => e.estacionId === estacion.id);
                const operador = estacion.operadorId ? personal.find(p => p.id === estacion.operadorId) : null;
                let iniciales = estadoOp?.iniciales || (operador ? getIniciales(operador.nombre) : null);

                return {
                    id: estacion.id, nombre: estacion.nombre,
                    operadorId: estacion.operadorId, operadorNombre: operador ? operador.nombre : null,
                    iniciales, estado: estadoOp ? estadoOp.estado : (operador ? 'inactivo' : 'empty'),
                    efectividad: estadoOp ? estadoOp.efectividad : 0
                };
            });
            return { id: area.id, nombre: area.nombre, color: area.color, posiciones };
        });
    }

    // ========================================
    // FAMILIAS Y SUBFAMILIAS
    // ========================================
    getFamilias() { return this.data.familias || []; }
    getFamilia(id) { return (this.data.familias || []).find(f => f.id === id); }

    addFamilia(familia) {
        const tempId = Math.max(...(this.data.familias || []).map(f => f.id), 0) + 1;
        const cached = { ...familia, id: tempId };
        this.data.familias.push(cached);
        SupabaseClient.insert('familias', { nombre: familia.nombre, color: familia.color }).then(r => {
            if (r) { const idx = this.data.familias.findIndex(f => f.id === tempId); if (idx !== -1) this.data.familias[idx].id = r.id; }
        });
        return cached;
    }

    updateFamilia(id, updates) {
        const index = (this.data.familias || []).findIndex(f => f.id === id);
        if (index === -1) return null;
        this.data.familias[index] = { ...this.data.familias[index], ...updates };
        SupabaseClient.update('familias', id, updates);
        return this.data.familias[index];
    }

    deleteFamilia(id) {
        if (!this.data.familias) return false;
        const index = this.data.familias.findIndex(f => f.id === id);
        if (index === -1) return false;
        this.data.familias.splice(index, 1);
        SupabaseClient.remove('familias', id);
        return true;
    }

    getSubfamilias() { return this.data.subfamilias || []; }
    getSubfamiliasByFamilia(familiaId) { return (this.data.subfamilias || []).filter(s => s.familiaId === familiaId); }
    getSubfamilia(id) { return (this.data.subfamilias || []).find(s => s.id === id); }

    addSubfamilia(subfamilia) {
        const tempId = Math.max(...(this.data.subfamilias || []).map(s => s.id), 0) + 1;
        const cached = { ...subfamilia, id: tempId };
        this.data.subfamilias.push(cached);
        SupabaseClient.insert('subfamilias', { familia_id: subfamilia.familiaId, nombre: subfamilia.nombre }).then(r => {
            if (r) { const idx = this.data.subfamilias.findIndex(s => s.id === tempId); if (idx !== -1) this.data.subfamilias[idx].id = r.id; }
        });
        return cached;
    }

    updateSubfamilia(id, updates) {
        const index = (this.data.subfamilias || []).findIndex(s => s.id === id);
        if (index === -1) return null;
        this.data.subfamilias[index] = { ...this.data.subfamilias[index], ...updates };
        const dbUpdates = {};
        if (updates.nombre) dbUpdates.nombre = updates.nombre;
        if (updates.familiaId) dbUpdates.familia_id = updates.familiaId;
        SupabaseClient.update('subfamilias', id, dbUpdates);
        return this.data.subfamilias[index];
    }

    deleteSubfamilia(id) {
        if (!this.data.subfamilias) return false;
        const index = this.data.subfamilias.findIndex(s => s.id === id);
        if (index === -1) return false;
        this.data.subfamilias.splice(index, 1);
        SupabaseClient.remove('subfamilias', id);
        return true;
    }

    getProductosByFamilia(familiaId) { return this.data.productos.filter(p => p.familiaId === familiaId); }
    getProductosBySubfamilia(subfamiliaId) { return this.data.productos.filter(p => p.subfamiliaId === subfamiliaId); }

    // ========================================
    // INVENTARIO DE PIEZAS
    // ========================================
    getInventarioPiezas() { return this.data.inventarioPiezas || []; }
    getInventarioPieza(id) { return this.getInventarioPiezas().find(p => p.id === id); }

    getInventarioPiezaByProductoProceso(productoId, procesoNombre) {
        const pid = String(productoId);
        const pn = (procesoNombre || '').toLowerCase().trim();
        return this.getInventarioPiezas().find(p => String(p.productoId) === pid && (p.procesoNombre || '').toLowerCase().trim() === pn);
    }

    getInventarioPiezasByProducto(productoId) {
        return this.getInventarioPiezas().filter(p => p.productoId === productoId);
    }

    addInventarioPieza(pieza) {
        const tempId = Math.max(...this.getInventarioPiezas().map(p => p.id), 0) + 1;
        const cached = {
            id: tempId, productoId: pieza.productoId, procesoNombre: pieza.procesoNombre,
            descripcion: pieza.descripcion || '', cantidadDisponible: pieza.cantidadDisponible || 0,
            cantidadMinima: pieza.cantidadMinima || 0, unidad: pieza.unidad || 'pzas',
            esPreproducible: true, ultimaActualizacion: new Date().toISOString(), historialMovimientos: []
        };
        this.data.inventarioPiezas.push(cached);

        SupabaseClient.insert('inventario_piezas', {
            producto_id: pieza.productoId, proceso_nombre: pieza.procesoNombre,
            descripcion: pieza.descripcion || '', cantidad_disponible: pieza.cantidadDisponible || 0,
            cantidad_minima: pieza.cantidadMinima || 0, unidad: pieza.unidad || 'pzas'
        }).then(r => {
            if (r) { const idx = this.data.inventarioPiezas.findIndex(p => p.id === tempId); if (idx !== -1) this.data.inventarioPiezas[idx].id = r.id; }
        });

        return cached;
    }

    updateInventarioPieza(id, updates) {
        const index = this.getInventarioPiezas().findIndex(p => p.id === id);
        if (index === -1) return null;
        this.data.inventarioPiezas[index] = { ...this.data.inventarioPiezas[index], ...updates, ultimaActualizacion: new Date().toISOString() };

        const dbUpdates = {};
        if (updates.cantidadDisponible !== undefined) dbUpdates.cantidad_disponible = updates.cantidadDisponible;
        if (updates.cantidadMinima !== undefined) dbUpdates.cantidad_minima = updates.cantidadMinima;
        if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
        SupabaseClient.update('inventario_piezas', id, dbUpdates);
        return this.data.inventarioPiezas[index];
    }

    deleteInventarioPieza(id) {
        if (!this.data.inventarioPiezas) return false;
        const index = this.data.inventarioPiezas.findIndex(p => p.id === id);
        if (index === -1) return false;
        this.data.inventarioPiezas.splice(index, 1);
        SupabaseClient.remove('inventario_piezas', id);
        return true;
    }

    agregarPiezasInventario(id, cantidad, motivo, pedidoId = null) {
        const pieza = this.getInventarioPieza(id);
        if (!pieza) return null;

        const saldoAnterior = pieza.cantidadDisponible;
        pieza.cantidadDisponible += cantidad;
        pieza.ultimaActualizacion = new Date().toISOString();
        this.save();

        SupabaseClient.update('inventario_piezas', id, { cantidad_disponible: pieza.cantidadDisponible });
        SupabaseClient.insert('movimientos_inventario', {
            inventario_pieza_id: id, tipo: 'entrada', cantidad, motivo, pedido_id: pedidoId,
            saldo_anterior: saldoAnterior, saldo_nuevo: pieza.cantidadDisponible
        });

        return pieza;
    }

    descontarPiezasInventario(id, cantidad, motivo, pedidoId = null) {
        const pieza = this.getInventarioPieza(id);
        if (!pieza) return null;
        if (pieza.cantidadDisponible < cantidad) {
            return { error: 'Cantidad insuficiente', disponible: pieza.cantidadDisponible };
        }

        const saldoAnterior = pieza.cantidadDisponible;
        pieza.cantidadDisponible -= cantidad;
        pieza.ultimaActualizacion = new Date().toISOString();

        SupabaseClient.update('inventario_piezas', id, { cantidad_disponible: pieza.cantidadDisponible });
        SupabaseClient.insert('movimientos_inventario', {
            inventario_pieza_id: id, tipo: 'salida', cantidad, motivo, pedido_id: pedidoId,
            saldo_anterior: saldoAnterior, saldo_nuevo: pieza.cantidadDisponible
        });

        return pieza;
    }

    verificarDisponibilidadPiezas(productoId) {
        return this.getInventarioPiezasByProducto(productoId).map(p => ({
            id: p.id, procesoNombre: p.procesoNombre, descripcion: p.descripcion,
            disponible: p.cantidadDisponible, minimo: p.cantidadMinima,
            alertaBaja: p.cantidadDisponible <= p.cantidadMinima
        }));
    }

    // ========================================
    // ARTÍCULOS FRECUENTES
    // ========================================
    getArticulosFrecuentes(clienteId) {
        const cliente = this.getCliente(clienteId);
        return cliente ? (cliente.articulosFrecuentes || []) : [];
    }

    addArticuloFrecuente(clienteId, articulo) {
        const index = this.data.clientes.findIndex(c => c.id === clienteId);
        if (index === -1) return null;
        if (!this.data.clientes[index].articulosFrecuentes) this.data.clientes[index].articulosFrecuentes = [];

        const existente = this.data.clientes[index].articulosFrecuentes.find(a => a.productoId === articulo.productoId);
        if (existente) {
            existente.notas = articulo.notas;
            existente.ultimoPrecio = articulo.ultimoPrecio;
        } else {
            this.data.clientes[index].articulosFrecuentes.push(articulo);
        }

        SupabaseClient.insert('articulos_frecuentes', {
            cliente_id: clienteId, producto_id: articulo.productoId,
            notas: articulo.notas, ultimo_precio: articulo.ultimoPrecio
        });

        this.addAuditoria('Artículo frecuente agregado', `Cliente ${clienteId}: Producto ${articulo.productoId}`, 'cliente', clienteId);
        return articulo;
    }

    removeArticuloFrecuente(clienteId, productoId) {
        const index = this.data.clientes.findIndex(c => c.id === clienteId);
        if (index === -1) return;
        if (this.data.clientes[index].articulosFrecuentes) {
            this.data.clientes[index].articulosFrecuentes = this.data.clientes[index].articulosFrecuentes.filter(a => a.productoId !== productoId);
        }
        // Delete from DB where cliente_id and producto_id match
        window.supabaseInstance.from('articulos_frecuentes').delete().eq('cliente_id', clienteId).eq('producto_id', productoId).then(() => {});
    }
}

// Exportar
window.SupabaseDatabase = SupabaseDatabase;
DEBUG_MODE && console.log('[SupabaseDB] Adapter cargado');
