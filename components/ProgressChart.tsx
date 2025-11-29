import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { WorkoutSession } from '../types';

interface ProgressChartProps {
  history: WorkoutSession[];
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ history }) => {
  // Transform data: Calculate total volume (Sets * Reps * Weight) per session
  // Or just track average intensity. Let's do Total Volume Load.
  
  const data = history
    .filter(session => session.completed)
    .map(session => {
        let totalVolume = 0;
        session.exercises.forEach(ex => {
            if (ex.performedSets) {
                ex.performedSets.forEach(s => {
                    totalVolume += (s.weight || 0) * (s.reps || 0);
                });
            }
        });
        
        return {
            date: new Date(session.completedDate || session.dateCreated).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit'}),
            volume: totalVolume,
            duration: session.durationMinutes // Maybe track actual duration if we had a timer
        };
    }).slice(-10); // Last 10 sessions

  if (data.length < 2) {
    return (
        <div className="h-64 flex items-center justify-center text-stone-500 bg-stone-800/50 rounded-lg border border-stone-700 border-dashed">
            Completa almeno 2 allenamenti per vedere il grafico dei progressi.
        </div>
    );
  }

  return (
    <div className="h-80 w-full bg-stone-800 p-4 rounded-xl border border-stone-700 shadow-lg">
      <h3 className="text-military-100 font-bold mb-4 uppercase tracking-wider text-sm">Volume di Allenamento (Kg Totali)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
          <XAxis dataKey="date" stroke="#a8a29e" fontSize={12} />
          <YAxis stroke="#a8a29e" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#292524', borderColor: '#57534e', color: '#f5f5f4' }}
            itemStyle={{ color: '#82a072' }}
          />
          <Line type="monotone" dataKey="volume" stroke="#638352" strokeWidth={3} activeDot={{ r: 8 }} dot={{fill: '#638352'}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};