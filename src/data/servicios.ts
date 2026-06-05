export interface Servicio {
  id: string;
  titulo: string;
  descripcion: string;
  icon: string;
  precio: number;
  duracion_minutos: number;
}

export const servicios: Servicio[] = [
  {
    id: 'penal',
    titulo: 'Defensa Penal',
    descripcion: 'Representación integral en procesos judiciales. Defendemos sus derechos y los de su familia con estrategias efectivas.',
    icon: 'scale',
    precio: 100000,
    duracion_minutos: 60,
  },
  {
    id: 'laboral',
    titulo: 'Derecho Laboral',
    descripcion: 'Asesoría en despidos injustificados, vulneración de derechos, liquidaciones y conflictos con empleadores.',
    icon: 'briefcase',
    precio: 100000,
    duracion_minutos: 60,
  },
  {
    id: 'civil',
    titulo: 'Civil y Familia',
    descripcion: 'Contratos, obligaciones, divorcios, custodia y sucesiones. Soluciones legales para sus conflictos personales.',
    icon: 'home',
    precio: 100000,
    duracion_minutos: 60,
  },
  {
    id: 'tierras',
    titulo: 'Restitución de Tierras',
    descripcion: 'Asesoría especializada a víctimas del conflicto armado para recuperar y titular sus predios.',
    icon: 'map',
    precio: 100000,
    duracion_minutos: 60,
  },
];