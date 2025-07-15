'use client'

import { memo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-sm text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const Charts = memo(({ grafici }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  
  if (!grafici) return null

  const handleBarClick = (data, index) => {
    setActiveIndex(index)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Grafico contratti per mese */}
      <div className="card border border-gray-200 animate-fade">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Contratti per Mese
          </h3>
          <div className="flex items-center text-xs space-x-4">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-primary-500 rounded-full mr-1"></span>
              <span>Nuovi</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
              <span>Scaduti</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={grafici.contrattiPerMese}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mese" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="nuovi" 
              stroke="#3B82F6" 
              strokeWidth={3} 
              name="Nuovi" 
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="scaduti" 
              stroke="#EF4444" 
              strokeWidth={3} 
              name="Scaduti" 
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Distribuzione fornitori */}
      <div className="card border border-gray-200 animate-fade">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top 5 Fornitori
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={grafici.topFornitori} onClick={handleBarClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="ragioneSociale" 
              angle={-45} 
              textAnchor="end" 
              height={80} 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="contratti" 
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            >
              {grafici.topFornitori.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  opacity={index === activeIndex ? 1 : 0.8}
                  stroke={index === activeIndex ? COLORS[index % COLORS.length] : 'none'}
                  strokeWidth={index === activeIndex ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

Charts.displayName = 'Charts'

export default Charts