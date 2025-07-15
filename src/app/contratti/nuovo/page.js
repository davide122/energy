"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Layout from "../../../components/Layout";

export default function NuovoContratto() {
  // Aggiungere la sidebar alla pagina di creazione contratto
  // Questo componente dovrebbe essere importato e utilizzato nel layout della pagina
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clienti, setClienti] = useState([]);
  const [fornitori, setFornitori] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [clienteHasContract, setClienteHasContract] = useState(false);
  const [lastFornitoreId, setLastFornitoreId] = useState(null);
  const [isSameFornitore, setIsSameFornitore] = useState(false);
  
  const [contract, setContract] = useState({
    clienteId: searchParams.get("clienteId") || "",
    fornitoreId: "",
    startDate: "",
    durataMesi: 24,
    penaltyFreeAfterMesi: 12,
    note: ""
  });
  
  const [errors, setErrors] = useState({});

  // Redirect se non autenticato
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Carica dati
  useEffect(() => {
    async function fetchData() {
      try {
        const [clientiResponse, fornitoriResponse] = await Promise.all([
          fetch("/api/clienti?limit=1000&includeAll=true"),
          fetch("/api/fornitori?limit=1000")
        ]);
        
        if (clientiResponse.ok && fornitoriResponse.ok) {
          const clientiData = await clientiResponse.json();
          const fornitoriData = await fornitoriResponse.json();
          setClienti(clientiData.clienti || []);
          setFornitori(fornitoriData.fornitori || []);
        }
      } catch (err) {
        setError("Errore nel caricamento dati");
      } finally {
        setDataLoading(false);
      }
    }
    
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Verifica se il cliente ha già un contratto quando viene selezionato
  useEffect(() => {
    async function checkClienteContratti() {
      if (!contract.clienteId) {
        setClienteHasContract(false);
        setLastFornitoreId(null);
        setIsSameFornitore(false);
        return;
      }
      
      try {
        // Utilizziamo l'endpoint dei contratti con filtro per clienteId
        const response = await fetch(`/api/contratti?clienteId=${contract.clienteId}&limit=1&sortBy=startDate&sortOrder=desc`);
        if (response.ok) {
          const data = await response.json();
          const hasContracts = data.contratti && data.contratti.length > 0;
          setClienteHasContract(hasContracts);
          
          // Se ci sono contratti, salviamo l'ID dell'ultimo fornitore
          if (hasContracts) {
            const lastContract = data.contratti[0];
            // Salviamo l'ID dell'ultimo fornitore senza log
            setLastFornitoreId(lastContract.fornitoreId);
            
            // Se c'è già un fornitore selezionato, verifichiamo se è lo stesso
            if (contract.fornitoreId) {
              const isSame = lastContract.fornitoreId === contract.fornitoreId;
              setIsSameFornitore(isSame);
              if (isSame) {
                setErrors(prev => ({
                  ...prev,
                  fornitoreId: 'Non è possibile utilizzare lo stesso fornitore consecutivamente'
                }));
              }
            }
          } else {
            setLastFornitoreId(null);
            setIsSameFornitore(false);
          }
          
          // Resettiamo lo stato di isSameFornitore quando cambia il cliente
          setIsSameFornitore(false);
        }
      } catch (err) {
        setError("Errore nel verificare i contratti del cliente");
      }
    }
    
    if (contract.clienteId) {
      checkClienteContratti();
    }
  }, [contract.clienteId]);

  const handleChange = (field, value) => {
    setContract(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Verifica se il fornitore selezionato è lo stesso dell'ultimo contratto
    if (field === "fornitoreId") {
      setError(null);
      if (lastFornitoreId && value === lastFornitoreId) {
        setIsSameFornitore(true);
        setErrors(prev => ({
          ...prev,
          fornitoreId: 'Non è possibile utilizzare lo stesso fornitore consecutivamente'
        }));
      } else {
        setIsSameFornitore(false);
        // Rimuovi l'errore se era stato impostato
        if (errors.fornitoreId === 'Non è possibile utilizzare lo stesso fornitore consecutivamente') {
          setErrors(prev => ({
            ...prev,
            fornitoreId: ''
          }));
        }
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!contract.clienteId) newErrors.clienteId = "Cliente richiesto";
    if (!contract.fornitoreId) newErrors.fornitoreId = "Fornitore richiesto";
    if (!contract.startDate) newErrors.startDate = "Data di inizio richiesta";
    if (!contract.durataMesi || contract.durataMesi < 1) newErrors.durataMesi = "Durata non valida";
    if (!contract.penaltyFreeAfterMesi || contract.penaltyFreeAfterMesi < 1) {
      newErrors.penaltyFreeAfterMesi = "Periodo penalty free non valido";
    }
    if (contract.penaltyFreeAfterMesi >= contract.durataMesi) {
      newErrors.penaltyFreeAfterMesi = "Deve essere inferiore alla durata totale";
    }
    
    // Verifica se il fornitore selezionato è lo stesso dell'ultimo contratto
    if (lastFornitoreId && contract.fornitoreId === lastFornitoreId) {
      newErrors.fornitoreId = "Non è possibile utilizzare lo stesso fornitore consecutivamente";
      setIsSameFornitore(true);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verifica esplicita se il fornitore selezionato è lo stesso dell'ultimo contratto
    if (lastFornitoreId && contract.fornitoreId === lastFornitoreId) {
      setIsSameFornitore(true);
      setErrors(prev => ({
        ...prev,
        fornitoreId: 'Non è possibile utilizzare lo stesso fornitore consecutivamente'
      }));
      return;
    }
    
    if (!validate()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/contratti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(contract)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nella creazione del contratto");
      }
      
      const newContract = await response.json();
      router.push(`/contratti/${newContract.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Non autenticato
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/contratti" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Torna ai contratti
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Nuovo Contratto</h1>
          <p className="mt-2 text-gray-600">Crea un nuovo contratto energetico</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {dataLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                  <select
                    value={contract.clienteId}
                    onChange={(e) => handleChange("clienteId", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.clienteId ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Seleziona cliente</option>
                    {clienti.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {`${cliente.nome} ${cliente.cognome} - ${cliente.email}`}
                      </option>
                    ))}
                  </select>
                  {errors.clienteId && (
                    <p className="mt-1 text-sm text-red-600">{errors.clienteId}</p>
                  )}
                  {clienteHasContract && (
                    <p className="mt-1 text-sm text-amber-600">Nota: Questo cliente ha già un contratto attivo.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fornitore *</label>
                  <select
                    value={contract.fornitoreId}
                    onChange={(e) => handleChange("fornitoreId", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fornitoreId || isSameFornitore ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Seleziona fornitore</option>
                    {fornitori.map(fornitore => (
                      <option 
                        key={fornitore.id} 
                        value={fornitore.id}
                        disabled={lastFornitoreId === fornitore.id}
                      >
                        {fornitore.ragioneSociale} {lastFornitoreId === fornitore.id ? "(ultimo utilizzato)" : ""}
                      </option>
                    ))}
                  </select>
                  {errors.fornitoreId && (
                    <p className="mt-1 text-sm text-red-600">{errors.fornitoreId}</p>
                  )}
                  {isSameFornitore && (
                    <p className="mt-1 text-sm text-red-600 font-bold">Non è possibile utilizzare lo stesso fornitore consecutivamente</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data di inizio *</label>
                  <input
                    type="date"
                    value={contract.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startDate ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Durata (mesi) *</label>
                    <input
                      type="number"
                      min="1"
                      value={contract.durataMesi}
                      onChange={(e) => handleChange("durataMesi", parseInt(e.target.value) || "")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.durataMesi ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.durataMesi && (
                      <p className="mt-1 text-sm text-red-600">{errors.durataMesi}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Penalty Free dopo (mesi) *</label>
                    <input
                      type="number"
                      min="1"
                      value={contract.penaltyFreeAfterMesi}
                      onChange={(e) => handleChange("penaltyFreeAfterMesi", parseInt(e.target.value) || "")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.penaltyFreeAfterMesi ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.penaltyFreeAfterMesi && (
                      <p className="mt-1 text-sm text-red-600">{errors.penaltyFreeAfterMesi}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                  <textarea
                    value={contract.note}
                    onChange={(e) => handleChange("note", e.target.value)}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-4 pt-6">
              <Link
                href="/contratti"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={loading || dataLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creazione..." : "Crea Contratto"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}