class Database {
    constructor() {
        this.dbName = 'FutsalLeagueDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear store para equipos
                if (!db.objectStoreNames.contains('equipos')) {
                    const equiposStore = db.createObjectStore('equipos', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    equiposStore.createIndex('nombre', 'nombre', { unique: true });
                }

                // Crear store para partidos
                if (!db.objectStoreNames.contains('partidos')) {
                    const partidosStore = db.createObjectStore('partidos', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    partidosStore.createIndex('fecha', 'fecha');
                    partidosStore.createIndex('jugado', 'jugado');
                }
            };
        });
    }

    // Métodos para equipos
    async addEquipo(equipo) {
        const transaction = this.db.transaction(['equipos'], 'readwrite');
        const store = transaction.objectStore('equipos');
        return store.add(equipo);
    }

    async getEquipos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['equipos'], 'readonly');
            const store = transaction.objectStore('equipos');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para partidos
    async addPartido(partido) {
        const transaction = this.db.transaction(['partidos'], 'readwrite');
        const store = transaction.objectStore('partidos');
        return store.add(partido);
    }

    async getPartidos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['partidos'], 'readonly');
            const store = transaction.objectStore('partidos');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPartidosPorEstado(jugado = false) {
        const partidos = await this.getPartidos();
        const ahora = new Date();
        
        return partidos.filter(partido => {
            const partidoJugado = partido.jugado || 
                (partido.golesLocal !== null && partido.golesVisitante !== null);
            
            return jugado ? partidoJugado : !partidoJugado;
        }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }
}

// Instancia global de la base de datos
const db = new Database();