import { useSyncExternalStore } from 'react';

export type KycStatus = 'pending' | 'approved' | 'rejected';
export type KycKind = 'vendor' | 'provider';

export interface KycDoc {
  label: string;
  file: string;
  uploadedAt: string;
}

export interface KycApplication {
  id: string;
  kind: KycKind;
  name: string;
  legalName: string;
  document: string; // CNPJ ou CPF
  category: string;
  city: string;
  email: string;
  phone: string;
  submittedAt: string;
  status: KycStatus;
  reason?: string;
  documents: KycDoc[];
}

const seed: KycApplication[] = [
  {
    id: 'kyc-1', kind: 'vendor', name: 'Cardápio Digital', legalName: 'Cardápio Digital Ltda', document: '12.345.678/0001-90',
    category: 'Tecnologia', city: 'São Paulo', email: 'contato@cardapiodigital.com', phone: '(11) 99999-1111',
    submittedAt: '2026-06-24T10:00:00Z', status: 'pending',
    documents: [
      { label: 'CNPJ', file: 'cnpj.pdf', uploadedAt: '2026-06-24' },
      { label: 'Contrato social', file: 'contrato.pdf', uploadedAt: '2026-06-24' },
      { label: 'Alvará sanitário', file: 'alvara.pdf', uploadedAt: '2026-06-24' },
    ],
  },
  {
    id: 'kyc-2', kind: 'vendor', name: 'Doce Encanto', legalName: 'Doceria Encanto ME', document: '23.456.789/0001-01',
    category: 'Doces', city: 'Campinas', email: 'oi@doceencanto.com', phone: '(19) 98888-2222',
    submittedAt: '2026-06-25T14:30:00Z', status: 'pending',
    documents: [
      { label: 'CNPJ', file: 'cnpj.pdf', uploadedAt: '2026-06-25' },
      { label: 'Identidade do sócio', file: 'rg.pdf', uploadedAt: '2026-06-25' },
    ],
  },
  {
    id: 'kyc-3', kind: 'provider', name: 'Rafael Encanador', legalName: 'Rafael S. Lima', document: '123.456.789-00',
    category: 'Encanador', city: 'São Paulo', email: 'rafael@servicos.com', phone: '(11) 97777-3333',
    submittedAt: '2026-06-26T09:15:00Z', status: 'pending',
    documents: [
      { label: 'CPF', file: 'cpf.pdf', uploadedAt: '2026-06-26' },
      { label: 'Comprovante de residência', file: 'comprovante.pdf', uploadedAt: '2026-06-26' },
      { label: 'Selfie com documento', file: 'selfie.jpg', uploadedAt: '2026-06-26' },
    ],
  },
  {
    id: 'kyc-4', kind: 'provider', name: 'Studio Beauty', legalName: 'Studio Beauty Estética', document: '34.567.890/0001-12',
    category: 'Estética', city: 'Rio de Janeiro', email: 'studio@beauty.com', phone: '(21) 96666-4444',
    submittedAt: '2026-06-26T16:00:00Z', status: 'pending',
    documents: [
      { label: 'CNPJ', file: 'cnpj.pdf', uploadedAt: '2026-06-26' },
    ],
  },
  {
    id: 'kyc-5', kind: 'vendor', name: 'Sabor & Arte', legalName: 'Sabor & Arte Gastronomia', document: '11.222.333/0001-44',
    category: 'Lanches', city: 'São Paulo', email: 'sabor@arte.com', phone: '(11) 95555-5555',
    submittedAt: '2026-06-15T11:00:00Z', status: 'approved',
    documents: [{ label: 'CNPJ', file: 'cnpj.pdf', uploadedAt: '2026-06-15' }],
  },
];

let applications: KycApplication[] = seed;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function getApplications() { return applications; }
export function setApplicationStatus(id: string, status: KycStatus, reason?: string) {
  applications = applications.map(a => (a.id === id ? { ...a, status, reason } : a));
  emit();
}

export function useKycApplications(): KycApplication[] {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => applications,
    () => applications,
  );
}
