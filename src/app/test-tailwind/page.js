import Layout from '../../components/Layout'

export default function TestTailwind() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">Test Tailwind CSS</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Card Standard</h2>
            <p className="text-gray-600 mb-4">Questa è una card con classi Tailwind standard.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Bottone Standard
            </button>
          </div>
          
          {/* Card 2 */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Card Personalizzata</h2>
            <p className="text-gray-600 mb-4">Questa card usa la classe .card personalizzata.</p>
            <button className="btn-primary">
              Bottone Personalizzato
            </button>
          </div>
          
          {/* Card 3 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Form Test</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Campo Standard:</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Input standard"
                />
              </div>
              <div>
                <label className="label">Campo Personalizzato:</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="Input personalizzato"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Test Badge</h2>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-success">Successo</span>
            <span className="badge badge-warning">Attenzione</span>
            <span className="badge badge-danger">Errore</span>
            <span className="badge badge-info">Info</span>
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Test Bottoni</h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary">Primario</button>
            <button className="btn-secondary">Secondario</button>
            <button className="btn-danger">Pericolo</button>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  )
}