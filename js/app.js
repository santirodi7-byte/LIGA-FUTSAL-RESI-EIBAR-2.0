class FutsalApp {
    constructor() {
        this.db = db;
        this.isAdmin = false; // ← AÑADIR ESTO
        this.adminPassword = "futsal2024"; // ← Y ESTO
        this.init();
    }

    async init() {
        try {
            await this.db.init();
            this.setupEventListeners();
            await this.cargarDatosIniciales();
            this.cargarClasificacion();
            this.cargarPartidos();
            this.cargarEquipos();
        } catch (error) {
            console.error('Error inicializando la app:', error);
        }
    }

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.cambiarTab(e.target.dataset.tab);
            });
        });

        // Modales
        document.getElementById('add-equipo-btn').addEventListener('click', () => {
            this.mostrarModal('equipo-modal');
        });

        document.getElementById('add-partido-btn').addEventListener('click', () => {
            this.cargarSelectEquipos();
            this.mostrarModal('partido-modal');
        });

        // Forms
        document.getElementById('equipo-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.agregarEquipo();
        });

        document.getElementById('partido-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.agregarPartido();
        });

        // Cerrar modales
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => {
                this.cerrarModales();
            });
        });

        // Cerrar modal al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.cerrarModales();
            }
        });
        document.getElementById('secret-admin-btn').addEventListener('click', () => {
        this.checkAdmin();
        });
        document.addEventListener('click', (e) => {
        // Botones de equipos
        if (e.target.classList.contains('btn-editar-equipo')) {
            const id = parseInt(e.target.dataset.id);
            this.editarEquipo(id);
        }
        if (e.target.classList.contains('btn-eliminar-equipo')) {
            const id = parseInt(e.target.dataset.id);
            this.eliminarEquipo(id);
        }
        
        // Botones de partidos
        if (e.target.classList.contains('btn-editar-partido')) {
            const id = parseInt(e.target.dataset.id);
            this.editarResultadoPartido(id);
        }
        if (e.target.classList.contains('btn-eliminar-partido')) {
            const id = parseInt(e.target.dataset.id);
            this.eliminarPartido(id);
        }
        });
    }

    cambiarTab(tabName) {
        // Remover active de todos los tabs y contenidos
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activar tab seleccionado
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    mostrarModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    cerrarModales() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.getElementById('equipo-form').reset();
        document.getElementById('partido-form').reset();
    }

    async cargarDatosIniciales() {
        const equipos = await this.db.getEquipos();
        if (equipos.length === 0) {
            // Datos de ejemplo
            const equiposEjemplo = [
                { nombre: 'Los Tigres', ciudad: 'Madrid', entrenador: 'Carlos Ruiz' },
                { nombre: 'Dragones FC', ciudad: 'Barcelona', entrenador: 'Ana López' },
                { nombre: 'Estrellas FS', ciudad: 'Valencia', entrenador: 'Miguel Torres' },
                { nombre: 'Relámpagos', ciudad: 'Sevilla', entrenador: 'Laura García' }
            ];

            for (const equipo of equiposEjemplo) {
                await this.db.addEquipo({
                    ...equipo,
                    puntos: 0,
                    partidosJugados: 0,
                    partidosGanados: 0,
                    partidosEmpatados: 0,
                    partidosPerdidos: 0,
                    golesFavor: 0,
                    golesContra: 0
                });
            }
        }
    }

    async cargarEquipos() {
        const equipos = await this.db.getEquipos();
        const equiposList = document.getElementById('equipos-list');
        
        equiposList.innerHTML = equipos.map(equipo => `
            <div class="equipo-card">
                <h3>${equipo.nombre}</h3>
                <p><strong>Ciudad:</strong> ${equipo.ciudad}</p>
                <p><strong>Entrenador:</strong> ${equipo.entrenador}</p>
                <p><strong>Puntos:</strong> ${equipo.puntos || 0}</p>
                ${this.isAdmin ? `
                <div class="admin-actions">
                <button class="btn-editar-equipo" data-id="${equipo.id}">✏️ Editar</button>
                <button class="btn-eliminar-equipo" data-id="${equipo.id}">🗑️ Eliminar</button>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    async cargarSelectEquipos() {
        const equipos = await this.db.getEquipos();
        const localSelect = document.getElementById('local-equipo');
        const visitanteSelect = document.getElementById('visitante-equipo');
        
        localSelect.innerHTML = '<option value="">Equipo local</option>';
        visitanteSelect.innerHTML = '<option value="">Equipo visitante</option>';
        
        equipos.forEach(equipo => {
            localSelect.innerHTML += `<option value="${equipo.id}">${equipo.nombre}</option>`;
            visitanteSelect.innerHTML += `<option value="${equipo.id}">${equipo.nombre}</option>`;
        });
    }

    async cargarPartidos() {
        const partidosProximos = await this.db.getPartidosPorEstado(false);
        const partidosJugados = await this.db.getPartidosPorEstado(true);
        
        this.mostrarPartidos(partidosProximos, 'proximos-partidos');
        this.mostrarPartidos(partidosJugados, 'partidos-jugados');
    }

mostrarPartidos(partidos, containerId) {
    const container = document.getElementById(containerId);
    
    if (partidos.length === 0) {
        container.innerHTML = '<p>No hay partidos registrados</p>';
        return;
    }

    container.innerHTML = partidos.map(partido => {
        const fecha = new Date(partido.fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let resultadoHTML = '';
        if (partido.jugado || (partido.golesLocal !== null && partido.golesVisitante !== null)) {
            resultadoHTML = `
                <div class="partido-card">
                    <div class="partido-info">
                        <span>${partido.localNombre}</span>
                        <span class="resultado">${partido.golesLocal} - ${partido.golesVisitante}</span>
                        <span>${partido.visitanteNombre}</span>
                    </div>
                    <p><small>${fecha}</small></p>
                    ${this.isAdmin ? `
                    <div class="admin-actions">
                        <button class="btn-editar-partido" data-id="${partido.id}">✏️ Resultado</button>
                        <button class="btn-eliminar-partido" data-id="${partido.id}">🗑️ Eliminar</button>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            resultadoHTML = `
                <div class="partido-card">
                    <div class="partido-info">
                        <span>${partido.localNombre}</span>
                        <span class="resultado">vs</span>
                        <span>${partido.visitanteNombre}</span>
                    </div>
                    <p><small>${fecha}</small></p>
                    ${this.isAdmin ? `
                    <div class="admin-actions">
                        <button class="btn-editar-partido" data-id="${partido.id}">✏️ Resultado</button>
                        <button class="btn-eliminar-partido" data-id="${partido.id}">🗑️ Eliminar</button>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        return resultadoHTML;
    }).join('');
}

    async agregarEquipo() {
        const nombre = document.getElementById('equipo-nombre').value;
        const ciudad = document.getElementById('equipo-ciudad').value;
        const entrenador = document.getElementById('equipo-entrenador').value;

        try {
            await this.db.addEquipo({
                nombre,
                ciudad,
                entrenador,
                puntos: 0,
                partidosJugados: 0,
                partidosGanados: 0,
                partidosEmpatados: 0,
                partidosPerdidos: 0,
                golesFavor: 0,
                golesContra: 0
            });

            this.cerrarModales();
            this.cargarEquipos();
            this.cargarClasificacion();
            this.mostrarMensaje('Equipo agregado correctamente');
        } catch (error) {
            this.mostrarMensaje('Error al agregar equipo', 'error');
        }
    }

    async agregarPartido() {
        const localId = parseInt(document.getElementById('local-equipo').value);
        const visitanteId = parseInt(document.getElementById('visitante-equipo').value);
        const golesLocal = document.getElementById('goles-local').value;
        const golesVisitante = document.getElementById('goles-visitante').value;
        const fecha = document.getElementById('fecha-partido').value;

        if (localId === visitanteId) {
            this.mostrarMensaje('Un equipo no puede jugar contra sí mismo', 'error');
            return;
        }

        const equipos = await this.db.getEquipos();
        const local = equipos.find(e => e.id === localId);
        const visitante = equipos.find(e => e.id === visitanteId);

        try {
            await this.db.addPartido({
                localId,
                visitanteId,
                localNombre: local.nombre,
                visitanteNombre: visitante.nombre,
                golesLocal: golesLocal ? parseInt(golesLocal) : null,
                golesVisitante: golesVisitante ? parseInt(golesVisitante) : null,
                fecha,
                jugado: !!(golesLocal && golesVisitante)
            });

            this.cerrarModales();
            this.cargarPartidos();
            this.cargarClasificacion();
            this.mostrarMensaje('Partido agregado correctamente');
        } catch (error) {
            this.mostrarMensaje('Error al agregar partido', 'error');
        }
    }

    async cargarClasificacion() {
        const equipos = await this.db.getEquipos();
        const partidos = await this.db.getPartidos();
        
        // Calcular estadísticas
        equipos.forEach(equipo => {
            equipo.partidosJugados = 0;
            equipo.partidosGanados = 0;
            equipo.partidosEmpatados = 0;
            equipo.partidosPerdidos = 0;
            equipo.golesFavor = 0;
            equipo.golesContra = 0;
            equipo.puntos = 0;
        });

        partidos.filter(p => p.jugado).forEach(partido => {
            const local = equipos.find(e => e.id === partido.localId);
            const visitante = equipos.find(e => e.id === partido.visitanteId);

            if (local && visitante) {
                // Actualizar estadísticas local
                local.partidosJugados++;
                local.golesFavor += partido.golesLocal;
                local.golesContra += partido.golesVisitante;

                // Actualizar estadísticas visitante
                visitante.partidosJugados++;
                visitante.golesFavor += partido.golesVisitante;
                visitante.golesContra += partido.golesLocal;

                // Determinar resultado
                if (partido.golesLocal > partido.golesVisitante) {
                    local.partidosGanados++;
                    local.puntos += 3;
                    visitante.partidosPerdidos++;
                } else if (partido.golesLocal < partido.golesVisitante) {
                    visitante.partidosGanados++;
                    visitante.puntos += 3;
                    local.partidosPerdidos++;
                } else {
                    local.partidosEmpatados++;
                    visitante.partidosEmpatados++;
                    local.puntos += 1;
                    visitante.puntos += 1;
                }
            }
        });

        // Ordenar por puntos (y diferencia de goles como desempate)
        equipos.sort((a, b) => {
            if (b.puntos !== a.puntos) return b.puntos - a.puntos;
            const diffA = a.golesFavor - a.golesContra;
            const diffB = b.golesFavor - b.golesContra;
            return diffB - diffA;
        });

        this.mostrarClasificacion(equipos);
    }

    mostrarClasificacion(equipos) {
        const tbody = document.getElementById('clasificacion-body');
        
        tbody.innerHTML = equipos.map((equipo, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${equipo.nombre}</strong></td>
                <td>${equipo.partidosJugados}</td>
                <td>${equipo.partidosGanados}</td>
                <td>${equipo.partidosEmpatados}</td>
                <td>${equipo.partidosPerdidos}</td>
                <td>${equipo.golesFavor}</td>
                <td>${equipo.golesContra}</td>
                <td><strong>${equipo.puntos}</strong></td>
            </tr>
        `).join('');
    }

    mostrarMensaje(mensaje, tipo = 'success') {
        // Implementación simple de mensajes
        alert(mensaje);
    }
        checkAdmin() {
        alert('Botón funcionando');
        const password = prompt("Introduce la contraseña de admin:");
        this.isAdmin = (password === this.adminPassword);
        
        console.log('isAdmin después de check:', this.isAdmin);

        if (this.isAdmin) {
            this.mostrarBotonesAdmin();
            alert("Modo admin activado");
        } else {
            alert("Contraseña incorrecta");
        }
    }

    mostrarBotonesAdmin() {
        this.cargarEquipos();
        this.cargarPartidos();
    }

    async eliminarEquipo(id) {
        console.log('eliminarEquipo llamado con id:', id); // ← Añadir
        if (!this.isAdmin) {
            console.log('No es admin');
            return;
        }
        if (confirm("¿Estás seguro de eliminar este equipo?")) {
            const transaction = this.db.transaction(['equipos'], 'readwrite');
            const store = transaction.objectStore('equipos');
            await store.delete(id);
            this.cargarEquipos();
            this.cargarClasificacion();
            this.mostrarMensaje('Equipo eliminado');
        }
    }

    async editarEquipo(id) {
        if (!this.isAdmin) return;
        
        console.log('=== INICIANDO editarEquipo ==='); // ← AQUÍ
    
        const equipos = await this.db.getEquipos();
        const equipo = equipos.find(e => e.id === id);
    
        console.log('Equipo encontrado:', equipo); // ← Y AQUÍ
    
        const nuevoNombre = prompt("Nuevo nombre:", equipo.nombre);
        
        if (nuevoNombre) {
            const equipoActualizado = {
                ...equipo,
                nombre: nuevoNombre,
                ciudad: nuevaCiudad,
                entrenador: nuevoEntrenador
            };
            
            const transaction = this.db.transaction(['equipos'], 'readwrite');
            const store = transaction.objectStore('equipos');
            
            // ESPERAR a que se complete la transacción
            await new Promise((resolve, reject) => {
                const request = store.put(equipoActualizado);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // ESPERAR a que se recarguen los datos
            await this.cargarEquipos();
            await this.cargarClasificacion();
            this.mostrarMensaje('Equipo actualizado');
        }
    }   

    async eliminarPartido(id) {
        if (!this.isAdmin) return;
        if (confirm("¿Eliminar este partido?")) {
            const transaction = this.db.transaction(['partidos'], 'readwrite');
            const store = transaction.objectStore('partidos');
            await store.delete(id);
            this.cargarPartidos();
            this.cargarClasificacion();
        }
    }

    async editarResultadoPartido(id) {
        if (!this.isAdmin) return;
       
        console.log('=== INICIANDO editarResultadoPartido ==='); // ← AQUÍ
    
        const partidos = await this.db.getPartidos();
        const partido = partidos.find(p => p.id === id);
    
        console.log('Partido encontrado:', partido); // ← Y AQUÍ
    
        const golesLocal = prompt("Goles local:", partido.golesLocal || 0);

        if (golesLocal !== null && golesVisitante !== null) {
            const partidoActualizado = {
                ...partido,
                golesLocal: parseInt(golesLocal),
                golesVisitante: parseInt(golesVisitante),
                jugado: true
            };
            
            const transaction = this.db.transaction(['partidos'], 'readwrite');
            const store = transaction.objectStore('partidos');
            
            // ESPERAR a que se complete
            await new Promise((resolve, reject) => {
                const request = store.put(partidoActualizado);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // ESPERAR a que se recarguen
            await this.cargarPartidos();
            await this.cargarClasificacion();
            this.mostrarMensaje('Resultado actualizado');
        }
    }
   
}

// Inicializar la app cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FutsalApp();
    window.app = app; // ← Hacer app global
});