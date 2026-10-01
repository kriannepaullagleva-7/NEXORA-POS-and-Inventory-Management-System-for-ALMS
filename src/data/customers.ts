export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export const customers: Customer[] = [
  { id: 'CUS-001', firstName: 'Rosario', lastName: 'Buenaventura', email: 'rosario.b@gmail.com', phone: '0917-111-2233', address: '12 Mint St, Countryville Exec. Homes, Cabantian, Davao City' },
  { id: 'CUS-002', firstName: 'Emmanuel', lastName: 'Fernandez', email: 'emman.f@yahoo.com', phone: '0928-111-2233', address: '34 Sampaguita Ave, Milan, Buhangin, Davao City' },
  { id: 'CUS-003', firstName: 'Ligaya', lastName: 'Villanueva', email: 'ligaya.v@gmail.com', phone: '0939-111-2233', address: '78 Rosal St, Deca Homes, Cabantian, Davao City' },
  { id: 'CUS-004', firstName: 'Renato', lastName: 'Castillo', email: 'renato.c@gmail.com', phone: '0945-111-2233', address: '5 Kalayaan Blvd, NHA Buhangin, Davao City' },
  { id: 'CUS-005', firstName: 'Marites', lastName: 'Ocampo', email: 'marites.o@outlook.com', phone: '0917-122-3344', address: '90 Rizal Extension, Chimes, Davao City' },
  { id: 'CUS-006', firstName: 'Danilo', lastName: 'Soriano', email: 'danilo.s@gmail.com', phone: '0928-122-3344', address: '22 A. Bonifacio St, Poblacion, Davao City' },
];
